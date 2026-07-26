import { escapeHtml } from "../helper";

interface PasswordChangedParams {
  firstName: string;
  changedAt: string;
  deviceInfo: string;
  location: string;
  supportUrl?: string;
}

export const passwordChangedEmailTemplate = ({
  firstName,
  changedAt = new Date().toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  }),
  deviceInfo,
  location,
  supportUrl = "https://yourapp.com/support",
}: PasswordChangedParams): string => {
  const safeFirstName = escapeHtml(firstName);
  const safeChangedAt = escapeHtml(changedAt);
  const safeDevice = escapeHtml(deviceInfo);
  const safeLocation = escapeHtml(location);
  const safeSupportUrl = escapeHtml(supportUrl);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Your password was changed</title>
    </head>
    <body style="margin:0; padding:20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f6f9fc;">
      <table align="center" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.05); padding:40px 30px;">
        <tr>
          <td>
            <!-- Header -->
            <h1 style="font-size:24px; font-weight:600; color:#1a1a2e; margin:0 0 8px 0;">Password Changed</h1>
            <p style="font-size:16px; color:#5a5a7a; margin:0 0 24px 0;">Hi ${safeFirstName},</p>

            <!-- Body -->
            <p style="font-size:16px; color:#333; line-height:1.6; margin:0 0 16px 0;">
              Your password was successfully changed on <strong>${safeChangedAt}</strong>.
            </p>

            <!-- Device details -->
            <div style="background:#f0f4f8; border-radius:6px; padding:16px 20px; margin:0 0 24px 0;">
              <p style="font-size:14px; color:#333; margin:0 0 4px 0;">
                <strong>Device:</strong> ${safeDevice}
              </p>
              <p style="font-size:14px; color:#333; margin:0;">
                <strong>Location:</strong> ${safeLocation}
              </p>
            </div>

            <!-- Important note -->
            <div style="background:#fef9e7; border-left:4px solid #f39c12; padding:14px 18px; margin:0 0 24px 0; border-radius:4px;">
              <p style="font-size:14px; color:#7d6608; margin:0;">
                ⚠️ If you did <strong>not</strong> make this change, please <a href="${safeSupportUrl}" style="color:#2E75B6; text-decoration:underline;">contact support immediately</a>.
              </p>
            </div>

            <!-- Footer -->
            <hr style="border:0; border-top:1px solid #e6eaf0; margin:28px 0 16px 0;" />
            <p style="font-size:13px; color:#8a8a9a; margin:0; line-height:1.5;">
              This is an automated security notification.<br />
              If you have questions, visit our <a href="${safeSupportUrl}" style="color:#2E75B6; text-decoration:none;">Help Center</a>.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
