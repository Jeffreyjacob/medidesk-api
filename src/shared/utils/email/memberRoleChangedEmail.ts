import { escapeHtml } from "../helper";

interface MemberRoleChangedParams {
  firstName: string;
  clinicName: string;
  oldRole: string;
  newRole: string;
  changedBy?: string;
}

export const memberRoleChangedEmailTemplate = ({
  firstName,
  clinicName,
  oldRole,
  newRole,
  changedBy,
}: MemberRoleChangedParams): string => {
  const safeFirstName = escapeHtml(firstName);
  const safeClinicName = escapeHtml(clinicName);
  const safeOldRole = escapeHtml(oldRole);
  const safeNewRole = escapeHtml(newRole);
  const safeChangedBy = changedBy ? escapeHtml(changedBy) : undefined;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Your role has been updated</title>
    </head>
    <body style="margin:0; padding:20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f6f9fc;">
      <table align="center" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.05); padding:40px 30px;">
        <tr>
          <td>
            <!-- Header -->
            <h1 style="font-size:24px; font-weight:600; color:#1a1a2e; margin:0 0 8px 0;">Role Updated</h1>
            <p style="font-size:16px; color:#5a5a7a; margin:0 0 24px 0;">Hi ${safeFirstName},</p>

            <!-- Body -->
            <p style="font-size:16px; color:#333; line-height:1.6; margin:0 0 16px 0;">
              Your role within <strong>${safeClinicName}</strong> has been changed.
            </p>

            <!-- Role change details -->
            <div style="background:#f0f4f8; border-radius:6px; padding:16px 20px; margin:0 0 20px 0;">
              <p style="font-size:14px; color:#333; margin:0 0 6px 0;">
                <strong>Previous role:</strong> ${safeOldRole}
              </p>
              <p style="font-size:14px; color:#333; margin:0 0 6px 0;">
                <strong>New role:</strong> ${safeNewRole}
              </p>
              ${safeChangedBy ? `<p style="font-size:14px; color:#333; margin:0;"><strong>Changed by:</strong> ${safeChangedBy}</p>` : ""}
            </div>

            <!-- What this means -->
            <p style="font-size:15px; color:#333; line-height:1.6; margin:0 0 16px 0;">
              This change may affect the features and permissions you have access to within the application.
            </p>

            <!-- Footer -->
            <hr style="border:0; border-top:1px solid #e6eaf0; margin:28px 0 16px 0;" />
            <p style="font-size:13px; color:#8a8a9a; margin:0; line-height:1.5;">
              This is an automated notification.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
