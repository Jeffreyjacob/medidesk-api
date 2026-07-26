import { escapeHtml } from "../helper";

interface AccountLockedParams {
  firstName: string;
  unlockAt: string; // e.g., "July 25, 2026 at 4:30 PM"
  reason?: string; // e.g., "too many failed login attempts"
  supportUrl?: string; // Link to contact support
}

export const accountLockedEmailTemplate = ({
  firstName,
  unlockAt,
  reason = "too many failed login attempts",
  supportUrl = "https://yourapp.com/support",
}: AccountLockedParams): string => {
  const safeFirstName = escapeHtml(firstName);
  const safeUnlockAt = escapeHtml(unlockAt);
  const safeReason = escapeHtml(reason);
  const safeSupportUrl = escapeHtml(supportUrl);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Your account has been locked</title>
    </head>
    <body style="margin:0; padding:20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f6f9fc;">
      <table align="center" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.05); padding:40px 30px;">
        <tr>
          <td>
            <!-- Header -->
            <h1 style="font-size:24px; font-weight:600; color:#1a1a2e; margin:0 0 8px 0;">Account Temporarily Locked</h1>
            <p style="font-size:16px; color:#5a5a7a; margin:0 0 24px 0;">Hi ${safeFirstName},</p>

            <!-- Body -->
            <p style="font-size:16px; color:#333; line-height:1.6; margin:0 0 16px 0;">
              For your security, your account has been temporarily locked due to <strong>${safeReason}</strong>.
            </p>

            <!-- Unlock time -->
            <div style="background:#f0f4f8; border-radius:6px; padding:16px 20px; margin:0 0 24px 0; text-align:center;">
              <p style="font-size:14px; color:#5a5a7a; margin:0 0 4px 0;">🔒 Your account will automatically unlock at:</p>
              <p style="font-size:22px; font-weight:700; color:#1a1a2e; margin:0;">${safeUnlockAt}</p>
            </div>

            <!-- Action options -->
            <p style="font-size:16px; color:#333; line-height:1.6; margin:0 0 12px 0;">
              If you need immediate assistance, you can:
            </p>
            <ul style="padding-left:20px; margin:0 0 24px 0;">
              <li style="font-size:14px; color:#333; margin-bottom:6px;">
                <a href="${safeSupportUrl}" style="color:#2E75B6; text-decoration:none;">Contact Support</a> for help
              </li>
            </ul>

            <!-- Important note -->
            <div style="background:#fde8e8; border-left:4px solid #e74c3c; padding:14px 18px; margin:0 0 24px 0; border-radius:4px;">
              <p style="font-size:14px; color:#922b21; margin:0;">
                ⚠️ If you didn’t attempt to log in recently, please <a href="${safeSupportUrl}" style="color:#2E75B6; text-decoration:underline;">contact us immediately</a> – someone may be trying to access your account.
              </p>
            </div>

            <!-- Footer -->
            <hr style="border:0; border-top:1px solid #e6eaf0; margin:28px 0 16px 0;" />
            <p style="font-size:13px; color:#8a8a9a; margin:0; line-height:1.5;">
              This is an automated security notification.<br />
              For assistance, visit our <a href="${safeSupportUrl}" style="color:#2E75B6; text-decoration:none;">Help Center</a>.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
