import { Resend } from 'resend';
import { render } from '@react-email/render';
import type { ReactElement } from 'react';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Email types
export interface EmailOptions {
  to: string | string[];
  subject: string;
  template: ReactElement;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface SignatureRequestEmailData {
  recipientName: string;
  recipientEmail: string;
  documentTitle: string;
  senderName: string;
  signatureUrl: string;
  expiresAt?: Date;
  message?: string;
}

export interface DocumentCompletedEmailData {
  recipientName: string;
  recipientEmail: string;
  documentTitle: string;
  completedAt: Date;
  totalSignatures: number;
  documentUrl?: string;
}

export interface ReminderEmailData {
  recipientName: string;
  recipientEmail: string;
  documentTitle: string;
  senderName: string;
  signatureUrl: string;
  daysPending: number;
  expiresAt?: Date;
}

// Default sender email
const DEFAULT_FROM = process.env.EMAIL_FROM || 'PayFlow <noreply@payflow.app>';

/**
 * Send an email using Resend
 */
export async function sendEmail({
  to,
  subject,
  template,
  from = DEFAULT_FROM,
  replyTo,
  cc,
  bcc,
}: EmailOptions) {
  const startTime = Date.now();
  const recipients = Array.isArray(to) ? to : [to];
  
  try {
    // Validate required environment variables
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipients.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      throw new Error(`Invalid email addresses: ${invalidEmails.join(', ')}`);
    }

    // Render the React email template to HTML
    const html = await render(template);

    // Log email attempt
    console.log(`📧 Sending email to ${recipients.join(', ')} - Subject: "${subject}"`);

    // Send email via Resend
    const result = await resend.emails.send({
      from,
      to: recipients,
      subject,
      html,
      replyTo,
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
    });

    if (result.error) {
      throw new Error(`Failed to send email: ${result.error.message}`);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Email sent successfully in ${duration}ms - ID: ${result.data?.id} - Recipients: ${recipients.join(', ')}`);
    
    return result.data;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`❌ Email sending failed after ${duration}ms:`, {
      error: errorMessage,
      recipients: recipients,
      subject,
      from,
      timestamp: new Date().toISOString(),
    });
    
    throw error;
  }
}

/**
 * Send email with fallback error handling
 * Returns true if sent successfully, false if failed
 */
export async function sendEmailSafe(options: EmailOptions): Promise<boolean> {
  try {
    await sendEmail(options);
    return true;
  } catch (error) {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    console.error(`🛡️ Email sending failed (safe mode) - Recipients: ${recipients.join(', ')} - Subject: "${options.subject}":`, error);
    
    // In development, you might want to see email failures more prominently
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Email failure in development - check your RESEND_API_KEY configuration');
    }
    
    return false;
  }
}

/**
 * Validate email configuration
 */
export function validateEmailConfig(): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!process.env.RESEND_API_KEY) {
    errors.push('RESEND_API_KEY environment variable is required');
  }

  if (!process.env.EMAIL_FROM) {
    errors.push('EMAIL_FROM environment variable is recommended');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if email functionality is available
 */
export function isEmailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Get email configuration status
 */
export function getEmailStatus() {
  const validation = validateEmailConfig();
  const isEnabled = isEmailEnabled();

  return {
    enabled: isEnabled,
    configured: validation.isValid,
    errors: validation.errors,
    from: DEFAULT_FROM,
  };
}