// Email configuration for password reset
// This file contains email templates and configuration

export const emailTemplates = {
  passwordReset: {
    subject: "Password Reset - Patram Management",
    html: (resetUrl: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1e40af; margin: 0;">Patram Management</h2>
        </div>
        
        <h3 style="color: #374151;">Password Reset Request</h3>
        
        <p style="color: #6b7280; line-height: 1.6;">
          You requested to reset your password for the Patram Management system.
        </p>
        
        <p style="color: #6b7280; line-height: 1.6;">
          Click the button below to reset your password:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #6b7280; line-height: 1.6; font-size: 14px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="color: #1e40af; word-break: break-all; font-size: 14px;">
          ${resetUrl}
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
        </p>
      </div>
    `,
    text: (resetUrl: string) => `
      Password Reset - Patram Management
      
      You requested to reset your password for the Patram Management system.
      
      Click the link below to reset your password:
      ${resetUrl}
      
      This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
    `
  }
};

// Email configuration
export const emailConfig = {
  from: "noreply@patram.com", // Update this with your actual email
  replyTo: "support@patram.com", // Update this with your support email
  siteName: "Patram Management",
  supportEmail: "support@patram.com"
};
