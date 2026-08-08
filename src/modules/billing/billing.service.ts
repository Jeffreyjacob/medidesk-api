import Stripe from "stripe";
import { AuthRepository } from "../authentication/auth.repository";
import {
  ClinicMemberRepository,
  ClinicRepository,
} from "../clinic/clinic.repository";
import {
  BillingHistoryRepository,
  StripeWebhookEventRepository,
  SubcriptionRepository,
} from "./billing.repository";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import {
  ClinicPlan,
  ClinicRole,
  SubscriptionStatus,
  WebhookEventStatus,
} from "../../generated/prisma/enums";
import { env } from "../../config/env";
import { Subscription } from "../../generated/prisma/client";
import { logger } from "../../config/logger";
import { classifyError } from "../../shared/utils/helper";
import { redis } from "../../config/redis";
import { IGetFailedWebhookInput } from "./billing.validation";

type StripeProcessResult =
  | { success: true; status: "processed" }
  | { success: true; status: "already_processed" }
  | { success: false; status: "failed"; error: string };

export class BillingService {
  constructor(
    private readonly clinicRepo: ClinicRepository,
    private readonly stripeWebhookEventRepo: StripeWebhookEventRepository,
    private readonly subscriptionRepo: SubcriptionRepository,
    private readonly billingHistory: BillingHistoryRepository,
    private readonly userRepo: AuthRepository,
    private readonly clinicMemberRepo: ClinicMemberRepository,
    private readonly stripe: Stripe,
  ) {}

  private async getOrCreateStripeCustomer(userId: string): Promise<string> {
    const user = await this.userRepo.findUserById(userId);
    if (!user) throw new NotFoundError("unable to find user");
    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await this.stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      metadata: { userId: user.id },
    });

    await this.userRepo.updateUserById({
      id: user.id,
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  private async syncClinicPlanFromSubscriptionStatus(
    clinicId: string,
    status: SubscriptionStatus,
  ) {
    const isPro = status === SubscriptionStatus.ACTIVE;
    await this.clinicRepo.updateClinic({
      id: clinicId,
      data: { plan: isPro ? ClinicPlan.PRO : ClinicPlan.FREE },
    });
  }

  async createCheckOutSession(
    userId: string,
    clinicId: string,
  ): Promise<{ url: string }> {
    const clinic = await this.clinicRepo.findClinicById(clinicId);
    if (!clinic) throw new NotFoundError("clinic not found");

    const member = await this.clinicMemberRepo.findMemberShip(
      userId,
      clinic.id,
    );

    if (!member)
      throw new BadRequestError("You are not member for this clinic");

    if (member.role !== ClinicRole.OWNER)
      throw new BadRequestError("You are not the owner for this clinic");

    if (clinic.plan === ClinicPlan.PRO)
      throw new BadRequestError("Clinic is already on Pro plan");

    const stripeCustomerId = await this.getOrCreateStripeCustomer(userId);

    const currentDoctorCount = await this.clinicMemberRepo.countInClinic({
      clinicId,
      where: { role: ClinicRole.DOCTOR },
    });

    const session = await this.stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [
        {
          price: env.STRIPE_PRICE_ID_PER_SEAT,
          quantity: currentDoctorCount,
        },
      ],
      success_url: `${env.FRONTEND_URL}/billings?success=true`,
      cancel_url: `${env.FRONTEND_URL}/billing?cancelled=true`,
      metadata: { clinicId, userId },
    });

    return { url: session.url! };
  }

  async getBillingStatus(
    clinicId: string,
  ): Promise<{ plan: ClinicPlan; subscription: Subscription | null }> {
    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    if (!subscription) {
      return { plan: ClinicPlan.FREE, subscription: null };
    }

    return { plan: ClinicPlan.PRO, subscription: subscription };
  }

  async cancelSubscription(clinicId: string) {
    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    if (!subscription) throw new NotFoundError("No active subscription");

    if (subscription.cancelAtPeriodEnd)
      throw new BadRequestError("subscription has already been cancelled");

    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await this.subscriptionRepo.updateSubscription(
      {
        clinicId,
      },
      {
        cancelledAt: new Date(),
        cancelAtPeriodEnd: true,
      },
    );

    return {
      message: "Subscription will be cancelled at the end of the billing",
    };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const clinicId = session.metadata?.clinicId;
    if (!clinicId) {
      logger.error(
        { sessionId: session.id },
        "Checkout session missing clinic id",
      );
      return;
    }

    const stripeSubscriptionId = session.subscription as string;
    const subscription =
      await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
    const item = subscription.items.data[0];

    await this.subscriptionRepo.createSubscription({
      clinicId,
      stripeSubscriptionId: subscription.id,
      status: SubscriptionStatus.ACTIVE,
      quatity: item.quantity ?? 1,
      currentPeriodEnd: new Date(item.current_period_end * 1000),
      currentPeriodStart: new Date(item.current_period_start * 1000),
      lastStripeEventAt: new Date(),
    });

    await this.syncClinicPlanFromSubscriptionStatus(
      clinicId,
      SubscriptionStatus.ACTIVE,
    );

    logger.info({ clinicId }, "Clinic upgraded to PRO");
  }

  private async handleSubscriptionUpdate(
    subscription: Stripe.Subscription,
    eventCreatedAt: number,
  ) {
    const existing = await this.subscriptionRepo.findByStripeSubscriptionId(
      subscription.id,
    );
    if (!existing) {
      logger.error(
        { subId: subscription.id },
        "Got update for unknown subscription",
      );
    }

    if (
      existing?.lastEventTimeStamp &&
      eventCreatedAt <= existing.lastEventTimeStamp.getTime()
    ) {
      logger.warn(
        { subId: subscription.id },
        "Ignoring stale out of order event",
      );
      return;
    }

    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELLED,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.CANCELLED,
      unpaid: SubscriptionStatus.PAST_DUE,
    };

    const newStatus =
      statusMap[subscription.status] ?? SubscriptionStatus.INCOMPLETE;
    const item = subscription.items.data[0];

    const updated = await this.subscriptionRepo.updateSubscription(
      {
        stripeSubscriptionId: subscription.id,
      },
      {
        status: newStatus,
        quantity: item.quantity,
        currentPeriodStart: new Date(item.current_period_start * 1000),
        currentPeriodEnd: new Date(item.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        lastEventTimeStamp: new Date(eventCreatedAt * 1000),
      },
    );

    await this.syncClinicPlanFromSubscriptionStatus(
      updated?.clinicId!,
      newStatus,
    );
  }
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const existing = await this.subscriptionRepo.findByStripeSubscriptionId(
      subscription.id,
    );

    if (!existing) return;

    await this.subscriptionRepo.updateSubscription(
      {
        stripeSubscriptionId: subscription.id,
      },
      {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    );

    await this.syncClinicPlanFromSubscriptionStatus(
      existing.clinicId,
      SubscriptionStatus.CANCELLED,
    );

    logger.info({ clinicId: existing.clinicId }, "Clinic downgraded to FREE");
  }

  private async handlePlatformInvoicePaid(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.parent?.subscription_details?.subscription;

    const subscription = await this.subscriptionRepo.findByStripeSubscriptionId(
      subscriptionId as string,
    );

    if (!subscription) {
      logger.warn(
        { subscriptionId },
        "unable to find subscription for paid invoice",
      );
      return;
    }

    await this.billingHistory.createBillingHistory({
      clinicId: subscription.clinicId,
      subscriptionId: subscription.id,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      invoiceUrl: invoice.hosted_invoice_url ?? undefined,
    });
  }

  async processStripeEvent(event: Stripe.Event): Promise<StripeProcessResult> {
    const eventKey = `webhook:processed:${event.id}`;
    const acquired = await redis.set(eventKey, "processing", "EX", 300, "NX");

    if (!acquired) {
      logger.info({ eventId: event.id }, "Event already processed (Redis)");
      return {
        success: true,
        status: "already_processed",
      };
    }

    const existing = await this.stripeWebhookEventRepo.findWebhookEventById(
      event.id,
    );

    if (existing?.status === "PROCESSED") {
      logger.info({ eventId: event.id }, "Event already processed (DB)");
      return {
        success: true,
        status: "already_processed",
      };
    }

    const record = existing
      ? await this.stripeWebhookEventRepo.incrementWebhookAttempts(existing.id)
      : await this.stripeWebhookEventRepo.createWebhookEvent(event);

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await this.handleCheckoutCompleted(
            event.data.object as Stripe.Checkout.Session,
          );
          break;
        case "customer.subscription.updated":
          await this.handleSubscriptionUpdate(
            event.data.object as Stripe.Subscription,
            event.created,
          );
          break;
        case "customer.subscription.deleted":
          await this.handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription,
          );
          break;
        case "invoice.paid":
          await this.handlePlatformInvoicePaid(
            event.data.object as Stripe.Invoice,
          );
          break;

        default:
          logger.info(
            { type: event.type },
            "Unhandled stripe event type - ignore",
          );
      }
      await redis.set(eventKey, "1", "EX", 846000);
      await this.stripeWebhookEventRepo.markWebhookProcessed(record?.id!);
      return {
        success: true,
        status: "processed",
      };
    } catch (err: any) {
      const errorType = classifyError(err);
      await this.stripeWebhookEventRepo.markWebhookFailed(
        record?.id!,
        err.message,
      );

      if (errorType === "transient") {
        logger.warn(
          { eventId: event.id, eventType: event.type, err: err.message },
          "Transient webhook failure",
        );
        throw err;
      } else {
        logger.error(
          { eventId: event.id, eventType: event.type },
          "Permanent webhook failed",
        );
      }

      return {
        success: false,
        status: "failed",
        error: err.message,
      };
    }
  }

  async getFailedWebhooks(data: IGetFailedWebhookInput) {
    return await this.stripeWebhookEventRepo.findFailedWebhooks({
      page: data.page,
      limit: data.limit,
    });
  }

  async replyWebhooEvent(eventId: string) {
    const MAX_REPLYAY_ATTEMPT = 5;
    const record = await this.stripeWebhookEventRepo.findWebhookById(eventId);
    if (!record) throw new NotFoundError("Webhook event not found");

    if (record.status === WebhookEventStatus.PROCESSED) {
      throw new BadRequestError("webhook event is already processed");
    }

    if ((record.attempts ?? 0) >= MAX_REPLYAY_ATTEMPT) {
      throw new BadRequestError(
        `webhook event has reached the maximum of ${MAX_REPLYAY_ATTEMPT}`,
      );
    }

    await this.stripeWebhookEventRepo.updateWebhookEvent(record.id, {
      status: WebhookEventStatus.PROCESSING,
      attempts: {
        increment: 1,
      },
    });

    try {
      switch (record.eventType) {
        case "checkout.session.completed":
          await this.handleCheckoutCompleted(record.payload as any);
          break;
        case "customer.subscription.updated":
          await this.handleSubscriptionUpdate(
            record.payload as any,
            (record.payload as any).created as number,
          );
          break;
        case "customer.subscription.deleted":
          await this.handleSubscriptionDeleted(record.payload as any);
          break;
        case "invoice.paid":
          await this.handlePlatformInvoicePaid(record.payload as any);
          break;

        default:
          logger.info(
            { type: record.eventType },
            "Unhandled stripe event type - ignore",
          );
      }

      await this.stripeWebhookEventRepo.updateWebhookEvent(eventId, {
        status: WebhookEventStatus.PROCESSED,
        error: null,
      });
      return { message: "webhook replayed succeed" };
    } catch (err: any) {
      await this.stripeWebhookEventRepo.updateWebhookEvent(eventId, {
        status: WebhookEventStatus.FAILED,
        error: err.message ?? String(err),
      });
      logger.error({ eventId }, "replay webhook Event Replay failed");
      throw new BadRequestError(err);
    }
  }
}
