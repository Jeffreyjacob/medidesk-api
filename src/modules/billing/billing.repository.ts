import {
  BillingHistory,
  Prisma,
  StripeWebhookEvent,
  Subscription,
  SubscriptionStatus,
  WebhookEventStatus,
} from "../../generated/prisma/client";
import {
  BillingHistoryDelegate,
  StripeWebhookEventDelegate,
  SubscriptionDelegate,
  SubscriptionUpdateInput,
} from "../../generated/prisma/models";
import {
  BaseRepository,
  OffsetPaginationResponse,
} from "../../shared/repository/baseRepository";
import Stripe from "stripe";

export class SubcriptionRepository extends BaseRepository<
  SubscriptionDelegate,
  Subscription
> {
  constructor() {
    super((client) => client.subscription);
  }

  findByClinicId(clinicId: string): Promise<Subscription | null> {
    return this.findUnique({
      where: { clinicId },
    });
  }

  async findByStripeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<Subscription | null> {
    return this.findUnique({
      where: { stripeSubscriptionId },
    });
  }

  async createSubscription(data: {
    clinicId: string;
    stripeSubscriptionId: string;
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    quantity: number;
    lastStripeEventAt: Date;
  }) {
    return this.create({
      data: {
        clinicId: data.clinicId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        status: data.status,
        currentPeriodEnd: data.currentPeriodEnd,
        currentPeriodStart: data.currentPeriodStart,
        cancelAtPeriodEnd: false,
        quantity: data.quantity,
        lastEventTimeStamp: data.lastStripeEventAt,
      },
    });
  }

  async syncFromStripe(
    stripeSubId: string,
    data: Partial<{
      status: SubscriptionStatus;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean;
    }>,
  ): Promise<Subscription | null> {
    return this.update({
      where: { stripeSubscriptionId: stripeSubId },
      data,
    });
  }
  async updateSubscription(
    where: Prisma.Args<SubscriptionDelegate, "update">["where"],
    data: SubscriptionUpdateInput,
  ) {
    return this.update({
      where,
      data,
    });
  }
}

export class BillingHistoryRepository extends BaseRepository<
  BillingHistoryDelegate,
  BillingHistory
> {
  constructor() {
    super((client) => client.billingHistory);
  }

  async createBillingHistory(data: {
    clinicId: string;
    subscriptionId: string;
    stripeInvoiceId: string;
    amount: number;
    currency: string;
    invoiceUrl?: string;
  }) {
    return this.create({
      data: {
        ...data,
      },
    });
  }
}

export class StripeWebhookEventRepository extends BaseRepository<
  StripeWebhookEventDelegate,
  StripeWebhookEvent
> {
  constructor() {
    super((client) => client.stripeWebhookEvent as any);
  }

  async findWebhookEventById(stripeEventId: string) {
    return this.findUnique({
      where: { stripeEventId },
    });
  }

  async createWebhookEvent(event: Stripe.Event) {
    return this.create({
      data: {
        eventType: event.type,
        stripeEventId: event.id,
        status: WebhookEventStatus.PROCESSING,
        payload: event.data.object as any,
      },
    });
  }

  async markWebhookProcessed(id: string) {
    return this.update({
      where: {
        id,
      },
      data: {
        status: WebhookEventStatus.PROCESSED,
        processedAt: new Date(),
      },
    });
  }

  async markWebhookFailed(id: string, error: string) {
    return this.update({
      where: {
        id,
      },
      data: {
        status: WebhookEventStatus.FAILED,
        error,
      },
    });
  }

  async incrementWebhookAttempts(id: string) {
    return this.update({
      where: {
        id,
      },
      data: {
        attempts: { increment: 1 },
      },
    });
  }

  async findFailedWebhooks(payload: {
    page?: number;
    limit?: number;
  }): Promise<OffsetPaginationResponse<StripeWebhookEvent>> {
    return this.findManyWithPagination({
      where: {
        status: WebhookEventStatus.FAILED,
      },
      page: payload.page,
      pageSize: payload.limit,
    });
  }

  async findWebhookById(id: string): Promise<StripeWebhookEvent | null> {
    return await this.findUnique({
      where: {
        id,
      },
    });
  }

  async updateWebhookEvent(
    id: string,
    update: Prisma.StripeWebhookEventUpdateInput,
  ): Promise<StripeWebhookEvent | null> {
    return this.update({
      where: { id },
      data: update,
    });
  }
}
