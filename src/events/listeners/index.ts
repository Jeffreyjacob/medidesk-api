import { auditListeners } from "./auditListeners";
import { emailListeners } from "./emailListeners";

export function registerAllListeners(): void {
  emailListeners();
  auditListeners();
}
