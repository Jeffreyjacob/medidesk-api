import { Request, Response } from "express";
import { BillingService } from "./billing.service";
import { ResponseHelper } from "../../shared/utils/apiResponse";
import Stripe from "stripe";
import { stripe } from "../../config/stripe";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { getFailedWebhookSchema } from "./billing.validation";

export class BillingController {
  constructor(private readonly service: BillingService) {}

  async createCheckOut(req: Request, res: Response) {
    const clinicId = req.user?.clinicId!;
    const userId = req.user?.userId!;
    const result = await this.service.createCheckOutSession(userId, clinicId);
    req.log?.info({ userId, clinicId }, "checkout created");
    ResponseHelper.success(res, result, 200, "checkout session created");
  }

  async getStatus(req: Request, res: Response) {
    const clinicId = req.user?.clinicId!;
    const result = await this.service.getBillingStatus(clinicId);
    ResponseHelper.success(res, result, 200, "subscription status fetched");
  }
  async cancel(req: Request, res: Response) {
    const clinicId = req.user!.clinicId;
    const result = await this.service.cancelSubscription(clinicId!);
    req.log?.info(
      { clinicId, cancelledBy: req.user?.userId },
      "clinic subscription cancelled",
    );
    ResponseHelper.success(res, result, 200, "subscription cancelled");
  }

  async handleWebhook(req: Request, res: Response) {
    const signature = req.headers["stripe-signature"] as string;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (error: any) {
      logger.warn({ error }, "Stripe signature verification failed");
      res.status(400).send("Invalid signature");
      return;
    }

    try {
      await this.service.processStripeEvent(event);
      res.status(200).json({ recieved: true });
    } catch (err: any) {
      logger.error({ err, eventType: event.type }, "Webhook processing failed");
      res.status(500).json({ recieved: false });
    }
  }
  async getFailedWebooks(req: Request, res: Response) {
    const data = getFailedWebhookSchema.parse(req.query);
    const result = await this.service.getFailedWebhooks(data);
    ResponseHelper.success(
      res,
      result.data,
      200,
      "Failed webhook fetched",
      result.meta,
    );
  }

  async replayWebhook(req: Request, res: Response) {
    const { eventId } = req.params;
    const result = await this.service.replyWebhooEvent(eventId as string);
    req.log?.info(
      { eventId, replayedBy: req.user?.userId },
      "Webhook Event replayed",
    );
    ResponseHelper.success(res, "", 200, result.message);
  }
}
