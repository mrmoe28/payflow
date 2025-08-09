# PayFlow Email Setup Guide

This guide explains how to set up email functionality in PayFlow using Resend.

## Quick Setup

### 1. Get Resend API Key
1. Sign up at [resend.com](https://resend.com)
2. Create a new API key in your dashboard
3. Copy the API key (starts with `re_`)

### 2. Configure Environment Variables
Add to your `.env.local` file:

```bash
# Email Provider (Resend)
RESEND_API_KEY="re_your_api_key_here"
EMAIL_FROM="PayFlow <noreply@yourdomain.com>"

# Required for email links
NEXTAUTH_URL="http://localhost:3000"  # or your production URL
```

### 3. Domain Setup (Production)
For production, you'll need to:
1. Add and verify your domain in Resend dashboard
2. Update `EMAIL_FROM` to use your verified domain
3. Set up DNS records as instructed by Resend

## Email Templates

PayFlow includes three professional email templates:

### 📧 Signature Request Email
- Sent when documents are created with `sendImmediately: true`
- Includes document title, sender name, and signing link
- Shows expiration date if set

### ⏰ Signature Reminder Email
- Sent when using "Resend" functionality in dashboard
- Smart urgency levels based on expiration
- Shows days pending

### ✅ Document Completed Email
- Sent when all signatures are collected
- Lists all signers and completion details
- Includes download link

## Testing Email Functionality

### Check Email Status
```bash
curl http://localhost:3000/api/test-email
```

### Send Test Emails
```bash
# Test signature request email
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "signature-request",
    "to": "test@example.com",
    "recipientName": "John Doe",
    "documentTitle": "Service Agreement",
    "senderName": "Jane Smith"
  }'

# Test reminder email
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "signature-reminder",
    "to": "test@example.com",
    "recipientName": "John Doe",
    "documentTitle": "Service Agreement",
    "senderName": "Jane Smith",
    "daysPending": 5
  }'

# Test completion email
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "document-completed",
    "to": "test@example.com",
    "recipientName": "Jane Smith",
    "documentTitle": "Service Agreement",
    "totalSignatures": 2
  }'
```

## Email Workflows

### Document Creation & Sending
1. User creates document with recipients
2. If `sendImmediately: true`, signature request emails are sent
3. Each recipient gets a personalized email with signing link

### Signature Completion
1. When someone signs a document
2. System checks if all signatures are collected
3. If complete, document owner gets completion notification

### Reminders & Follow-ups
1. Use "Resend" button in dashboard for individual reminders
2. Use bulk resend for multiple pending signatures
3. Smart urgency based on expiration dates

## Email Configuration Options

### Sender Configuration
```typescript
// Default sender (from EMAIL_FROM env var)
"PayFlow <noreply@yourdomain.com>"

// Custom sender per email
await sendEmail({
  from: "Custom Name <custom@yourdomain.com>",
  // ... other options
});
```

### Error Handling
PayFlow uses `sendEmailSafe()` for graceful error handling:
- Logs errors without breaking app functionality
- Returns success/failure status
- Continues workflow even if email fails

### Development vs Production
- **Development**: Emails work with Resend's test domain
- **Production**: Requires verified domain for better deliverability
- **Testing**: Use `/api/test-email` endpoint for validation

## Troubleshooting

### Common Issues

**"RESEND_API_KEY environment variable is not set"**
- Make sure `.env.local` contains your Resend API key
- Restart your development server after adding env vars

**"Failed to send email: Domain not found"**
- For production, verify your domain in Resend dashboard
- For development, you can use Resend's test domain

**Email not received**
- Check spam/junk folders
- Verify recipient email address
- Check Resend dashboard for delivery status

### Debugging
1. Check email status: `GET /api/test-email`
2. Send test email: `POST /api/test-email`
3. Check server logs for email errors
4. Verify environment variables are loaded

## Advanced Features

### Custom Email Templates
Email templates are React components in `src/emails/`:
- `signature-request.tsx`
- `signature-reminder.tsx`  
- `document-completed.tsx`

### Bulk Operations
The signature router supports bulk email sending for:
- Multiple reminder emails
- Batch signature requests
- Document notifications

### Email Preferences (Future)
Framework is in place for user email preferences:
- Notification types
- Frequency settings
- Opt-out options

## Security & Privacy

- Emails include unsubscribe information
- Signature links are secure and time-limited
- No sensitive document content in emails
- GDPR-friendly sender information

## Need Help?

1. Check Resend dashboard for delivery status
2. Use the test endpoint to verify configuration
3. Check server logs for detailed error messages
4. Ensure all environment variables are properly set