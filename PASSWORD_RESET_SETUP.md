# Password Reset Setup Instructions

## Overview
The password reset functionality has been implemented with the following features:
- Forgot password page (`/forgot-password`)
- Reset password page (`/reset-password`)
- Email validation against your users table
- Secure password reset flow

## Setup Required

### 1. Supabase Email Configuration
You need to configure email settings in your Supabase project:

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Settings**
3. Configure the following:

#### Email Templates
- **Reset Password**: Customize the email template
- **Redirect URL**: Set to `https://yourdomain.com/reset-password`

#### SMTP Settings (Optional but Recommended)
For better email delivery, configure SMTP:

1. Go to **Authentication** > **Settings** > **SMTP Settings**
2. Enable **Enable custom SMTP**
3. Configure your SMTP provider:
   - **SMTP Host**: Your SMTP server
   - **SMTP Port**: Usually 587 or 465
   - **SMTP User**: Your email username
   - **SMTP Pass**: Your email password
   - **SMTP Admin Email**: Your admin email
   - **SMTP Sender Name**: "Patram Management"

### 2. Environment Variables
Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Email Providers (Recommended)
For production, consider using these email services:

#### Option 1: SendGrid
- Sign up at [SendGrid](https://sendgrid.com)
- Get API key
- Configure in Supabase SMTP settings

#### Option 2: Mailgun
- Sign up at [Mailgun](https://mailgun.com)
- Get SMTP credentials
- Configure in Supabase SMTP settings

#### Option 3: AWS SES
- Set up AWS SES
- Get SMTP credentials
- Configure in Supabase SMTP settings

## How It Works

### 1. Forgot Password Flow
1. User clicks "Forgot your password?" on login page
2. User enters email address
3. System validates email exists in users table
4. Supabase sends password reset email
5. User receives email with reset link

### 2. Reset Password Flow
1. User clicks link in email
2. Redirected to `/reset-password` page
3. User enters new password (twice for confirmation)
4. Password updated in both Supabase Auth and users table
5. User redirected to login page

## Security Features
- Email validation against your users table
- Secure token-based reset links
- Password confirmation required
- Automatic session cleanup after reset
- Link expiration (1 hour by default)

## Testing
1. Go to `/login`
2. Click "Forgot your password?"
3. Enter your admin email
4. Check your email for reset link
5. Click link and set new password

## Troubleshooting

### Email Not Received
1. Check spam folder
2. Verify SMTP configuration in Supabase
3. Check Supabase logs for email errors
4. Ensure email address exists in users table

### Reset Link Not Working
1. Check if link has expired (1 hour limit)
2. Verify redirect URL in Supabase settings
3. Check browser console for errors

### Password Update Fails
1. Ensure password meets requirements (min 6 characters)
2. Check Supabase logs for update errors
3. Verify user has valid session

## Customization
You can customize the email templates in Supabase Dashboard:
- **Authentication** > **Settings** > **Email Templates**
- Edit the "Reset Password" template
- Use HTML and CSS for styling

## Production Checklist
- [ ] Configure SMTP settings
- [ ] Test email delivery
- [ ] Set up proper domain for redirects
- [ ] Configure email templates
- [ ] Test complete flow
- [ ] Set up monitoring for email delivery
