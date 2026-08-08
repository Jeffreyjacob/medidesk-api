import { billingService } from "../../controller";
import { auditListeners } from "./auditListeners";
import { seatSyncListeners } from "./billingListeners";
import { emailListeners } from "./emailListeners";

export function registerAllListeners(): void {
  emailListeners();
  auditListeners();
  seatSyncListeners(billingService);
}
