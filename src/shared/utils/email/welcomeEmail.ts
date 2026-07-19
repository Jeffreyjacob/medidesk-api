// Email Templates
export function buildNewUserWelcomeEmail(data: {
  firstName: string;
  clinicName: string;
  loginUrl: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to ${data.clinicName}, ${data.firstName}! 👋</h2>
      <p>You've successfully created your account and joined <strong>${data.clinicName}</strong>.</p>
      <p>You can now log in to access your clinic dashboard and start collaborating.</p>
      <a href="${data.loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 4px;">
        Log In Now
      </a>
      <p style="margin-top: 20px; font-size: 14px; color: #666;">
        If you didn't expect this invitation, please ignore this email or contact support.
      </p>
    </div>
  `;
}

export function buildExistingUserAddedEmail(data: {
  firstName: string;
  clinicName: string;
  role: string;
  dashboardUrl: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>You've been added to a new clinic!</h2>
      <p>Hi ${data.firstName},</p>
      <p>You have been added to <strong>${data.clinicName}</strong> as a <strong>${data.role}</strong>.</p>
      <p>Log in to your dashboard to view your new clinic and start working on cases.</p>
      <a href="${data.dashboardUrl}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: #fff; text-decoration: none; border-radius: 4px;">
        Go to Dashboard
      </a>
      <p style="margin-top: 20px; font-size: 14px; color: #666;">
        This is a notification from your clinic management system.
      </p>
    </div>
  `;
}
