import { escapeHtml } from "../helper";

interface MemberRemovedParams {
  firstName: string;
  clinicName: string;
  removedBy?: string;
  reason?: string;
}

export const memberRemovedEmailTemplate = ({
  firstName,
  clinicName,
  removedBy,
  reason,
}: MemberRemovedParams): string => {
  const safeFirstName = escapeHtml(firstName);
  const safeClinicName = escapeHtml(clinicName);
  const safeRemovedBy = removedBy ? escapeHtml(removedBy) : undefined;
  const safeReason = reason ? escapeHtml(reason) : undefined;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>You have been removed from a clinic</title>
    </head>
    <body style="margin:0; padding:20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f6f9fc;">
      <table align="center" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.05); padding:40px 30px;">
        <tr>
          <td>
            <!-- Header -->
            <h1 style="font-size:24px; font-weight:600; color:#1a1a2e; margin:0 0 8px 0;">Clinic Membership Removed</h1>
            <p style="font-size:16px; color:#5a5a7a; margin:0 0 24px 0;">Hi ${safeFirstName},</p>

            <!-- Body -->
            <p style="font-size:16px; color:#333; line-height:1.6; margin:0 0 16px 0;">
              You have been removed from <strong>${safeClinicName}</strong>.
            </p>

            <!-- Details -->
            <div style="background:#f0f4f8; border-radius:6px; padding:16px 20px; margin:0 0 20px 0;">
              ${safeRemovedBy ? `<p style="font-size:14px; color:#333; margin:0 0 6px 0;"><strong>Removed by:</strong> ${safeRemovedBy}</p>` : ""}
              ${safeReason ? `<p style="font-size:14px; color:#333; margin:0;"><strong>Reason:</strong> ${safeReason}</p>` : ""}
            </div>

            <!-- What this means -->
            <p style="font-size:15px; color:#333; line-height:1.6; margin:0 0 16px 0;">
              You will no longer have access to this clinic's resources, data, or permissions within the application.
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
