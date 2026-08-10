import { Job } from "bullmq";
import { ClinicRole, SubscriptionStatus } from "../../generated/prisma/enums";
import { stripe } from "../../config/stripe";
import { logger } from "../../config/logger";
import { clinicMemberRepo, subscriptionRepo } from "../../controller";
import { mapStripeStatusToInternal } from "../../shared/utils/helper";
import Stripe from "stripe";
import { Subscription } from "../../generated/prisma/client";
import { prisma } from "../../config/database";

interface Drift {
  subscriptionId: string;
  clinicId: string;
  field:
    | "status"
    | "currentEmployeeCountCache"
    | "stripeSeatQuantity"
    | "existence";
  dbValue: any;
  stripeValue: any;
  autoCorrected: boolean;
  correctionDirection?: "stripe_to_db" | "db_to_stripe";
}

const reconcileOne = async (subscription: Subscription): Promise<Drift[]> => {
  const drifts: Drift[] = [];
  let stripeSub: Stripe.Subscription;

  try {
    stripeSub = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
    );
  } catch (err: any) {
    logger.error(
      {
        subscriptionId: subscription.id,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        err,
      },
      "[reconcileOne] subscription unreachable",
    );
    drifts.push({
      subscriptionId: subscription.id,
      clinicId: subscription.clinicId,
      field: "existence",
      dbValue: subscription.stripeSubscriptionId,
      stripeValue: "not found",
      autoCorrected: false,
    });
    return drifts;
  }

  const stripeStatus = mapStripeStatusToInternal(stripeSub.status);
  const stripeQuantity = stripeSub.items.data[0].quantity ?? 0;

  if (stripeStatus !== subscription.status) {
    drifts.push({
      subscriptionId: subscription.id,
      clinicId: subscription.clinicId,
      field: "status",
      dbValue: subscription.status,
      stripeValue: stripeStatus,
      autoCorrected: true,
      correctionDirection: "stripe_to_db",
    });
  }

  const activeDoctor = await clinicMemberRepo.countInClinic({
    clinicId: subscription.clinicId,
    where: {
      role: ClinicRole.DOCTOR,
    },
  });

  const trueActiveCount = Math.max(1, activeDoctor);

  const dbCacheStale = (subscription.quantity ?? 0) !== trueActiveCount;
  const stripeSeatStale = stripeQuantity !== trueActiveCount;

  if (dbCacheStale) {
    drifts.push({
      subscriptionId: subscription.id,
      clinicId: subscription.clinicId,
      field: "currentEmployeeCountCache",
      dbValue: subscription.quantity ?? 0,
      stripeValue: trueActiveCount,
      autoCorrected: true,
      correctionDirection: "db_to_stripe",
    });
  }

  if (stripeSeatStale) {
    drifts.push({
      subscriptionId: subscription.id,
      clinicId: subscription.clinicId,
      field: "stripeSeatQuantity",
      dbValue: trueActiveCount,
      stripeValue: stripeQuantity,
      autoCorrected: true,
      correctionDirection: "db_to_stripe",
    });
  }

  const statusDrift = drifts.find((d) => d.field === "status");
  const dbCacheDrift = drifts.find(
    (d) => d.field === "currentEmployeeCountCache",
  );
  const stripeSeatDrift = drifts.find((d) => d.field === "stripeSeatQuantity");

  if (statusDrift || dbCacheDrift) {
    await subscriptionRepo.updateSubscription(
      {
        id: subscription.id,
      },
      {
        ...(statusDrift && { status: stripeStatus }),
        ...(dbCacheDrift && { quantity: trueActiveCount }),
      },
    );
  }

  if (stripeSeatDrift) {
    const itemId = stripeSub.items.data[0].id;
    if (!itemId) {
      logger.error(
        {
          subscriptionId: subscription.id,
          stripeSubscription: subscription.stripeSubscriptionId,
        },
        "[reconcileOne] No stripe subscription item found",
      );
    } else {
      const effectiveStatus = statusDrift ? stripeStatus : subscription.status;
      const isActive = effectiveStatus === SubscriptionStatus.ACTIVE;
      const prorationBehavior = isActive ? "create_prorations" : "none";

      try {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId!, {
          items: [{ id: itemId, quantity: trueActiveCount }],
          proration_behavior: prorationBehavior,
        });
      } catch (error: any) {
        logger.error(
          "[reconcileOne] Failed to push seat count correction to Stripe",
          error,
          {
            subscriptionId: subscription.id,
            trueActiveCount,
            stripeQuantity,
          },
        );
        stripeSeatDrift.autoCorrected = false;
      }
    }
  }

  return drifts;
};

export const reconcileSubscriptionProcessor = async (job: Job) => {
  const activeSubscriptions = await prisma.subscription.findMany({
    where: {
      status: {
        in: [
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.TRIALING,
          SubscriptionStatus.PAST_DUE,
        ],
      },
    },
  });

  const allDrifts: Drift[] = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < activeSubscriptions.length; i += BATCH_SIZE) {
    const batch = activeSubscriptions.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((sub: Subscription) => reconcileOne(sub)),
    );
    results.forEach((r) => allDrifts.push(...r));

    const processedCount = Math.min(i + BATCH_SIZE, activeSubscriptions.length);
    await job.updateProgress(
      Math.round((processedCount / activeSubscriptions.length) * 100),
    );
  }

  const needReview = allDrifts.filter((d) => !d.autoCorrected);

  logger.info(
    {
      manual: job.data?.manual ?? false,
      totalChecked: activeSubscriptions.length,
      totalDrifts: allDrifts.length,
      autoCorrected: allDrifts.filter((d) => d.autoCorrected).length,
      needsReview: needReview.length,
    },
    "[dailySubscriptionReconciliation] Run complete",
  );

  if (needReview.length > 0) {
    logger.error(
      { drifts: needReview },
      "[dailySubscriptionReconciliation] Discrepancies require manual review",
    );

    //! Alert a human - money related drift shouldn't sit in a log line
  }

  return { totalChecked: activeSubscriptions.length, drifts: allDrifts };
};
