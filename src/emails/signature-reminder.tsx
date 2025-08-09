import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { CSSProperties } from 'react';
import { format } from 'date-fns';

interface SignatureReminderEmailProps {
  recipientName: string;
  documentTitle: string;
  senderName: string;
  signatureUrl: string;
  daysPending: number;
  expiresAt?: Date;
  message?: string;
}

export default function SignatureReminderEmail({
  recipientName,
  documentTitle,
  senderName,
  signatureUrl,
  daysPending,
  expiresAt,
  message,
}: SignatureReminderEmailProps) {
  const previewText = `Friendly reminder: "${documentTitle}" is still waiting for your signature`;

  const getUrgencyLevel = () => {
    if (!expiresAt) return 'normal';
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 1) return 'urgent';
    if (daysUntilExpiry <= 3) return 'high';
    return 'normal';
  };

  const urgency = getUrgencyLevel();

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logo}>PayFlow</Text>
          </Section>

          <Section style={content}>
            <Section style={reminderSection}>
              <Text style={reminderEmoji}>⏰</Text>
              <Text style={heading}>Signature Reminder</Text>
            </Section>
            
            <Text style={paragraph}>
              Hi {recipientName},
            </Text>
            
            <Text style={paragraph}>
              This is a friendly reminder that <strong>{senderName}</strong> is still waiting for your signature on:
            </Text>

            <Section style={documentSection}>
              {/* @ts-ignore */}
              <Text style={documentTitle}>{documentTitle}</Text>
              <Text style={pendingDetails}>
                Pending for {daysPending} day{daysPending !== 1 ? 's' : ''}
              </Text>
            </Section>

            {urgency === 'urgent' && expiresAt && (
              <Section style={urgentSection}>
                <Text style={urgentText}>
                  🚨 <strong>Action Required Today!</strong>
                </Text>
                <Text style={urgentText}>
                  This document expires today at {format(expiresAt, 'h:mm a')}
                </Text>
              </Section>
            )}

            {urgency === 'high' && expiresAt && (
              <Section style={warningSection}>
                <Text style={warningText}>
                  ⚠️ <strong>Expiring Soon</strong>
                </Text>
                <Text style={warningText}>
                  This document expires on {format(expiresAt, 'MMMM d \'at\' h:mm a')}
                </Text>
              </Section>
            )}

            {urgency === 'normal' && expiresAt && (
              <Section style={infoSection}>
                <Text style={infoText}>
                  📅 <strong>Deadline:</strong> {format(expiresAt, 'MMMM d, yyyy \'at\' h:mm a')}
                </Text>
              </Section>
            )}

            {message && (
              <Section style={messageSection}>
                <Text style={messageLabel}>Message from {senderName}:</Text>
                <Text style={messageText}>{message}</Text>
              </Section>
            )}

            <Section style={buttonSection}>
              <Button href={signatureUrl} style={button}>
                Sign Document Now
              </Button>
            </Section>

            <Text style={paragraph}>
              Or copy and paste this link into your browser:
            </Text>
            <Link href={signatureUrl} style={link}>
              {signatureUrl}
            </Link>

            <Section style={helpSection}>
              <Text style={helpHeading}>Need help?</Text>
              <Text style={helpText}>
                • The signing process takes less than 2 minutes
              </Text>
              <Text style={helpText}>
                • No account required - just click the link above
              </Text>
              <Text style={helpText}>
                • If you have questions, contact {senderName} directly
              </Text>
            </Section>

            <Hr style={hr} />
            
            <Text style={footer}>
              This reminder was sent by PayFlow on behalf of {senderName}. 
              If you no longer wish to receive reminders for this document, please contact the sender.
            </Text>
            
            <Text style={footer}>
              PayFlow - Digital Document Signing Made Simple
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  padding: '10px 0',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #f0f0f0',
  borderRadius: '8px',
  margin: '0 auto',
  padding: '20px',
  width: '580px',
};

const logoSection = {
  textAlign: 'center' as const,
  padding: '20px 0',
};

const logo = {
  color: '#2563eb',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const content = {
  padding: '0 20px',
};

const reminderSection = {
  textAlign: 'center' as const,
  margin: '20px 0',
};

const reminderEmoji = {
  fontSize: '48px',
  margin: '0 0 16px 0',
};

const heading = {
  color: '#f59e0b',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
};

const paragraph = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '16px 0',
};

const documentSection = {
  backgroundColor: '#fef3c7',
  border: '1px solid #f59e0b',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
  textAlign: 'center' as const,
};

const documentTitle: CSSProperties = {
  color: '#78350f',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};

const pendingDetails = {
  color: '#92400e',
  fontSize: '14px',
  fontStyle: 'italic',
  margin: '0',
};

const urgentSection = {
  backgroundColor: '#fef2f2',
  border: '2px solid #dc2626',
  borderRadius: '8px',
  padding: '16px',
  margin: '20px 0',
  textAlign: 'center' as const,
};

const urgentText = {
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: '600',
  margin: '4px 0',
};

const warningSection = {
  backgroundColor: '#fefce8',
  border: '2px solid #eab308',
  borderRadius: '8px',
  padding: '16px',
  margin: '20px 0',
  textAlign: 'center' as const,
};

const warningText = {
  color: '#a16207',
  fontSize: '14px',
  fontWeight: '600',
  margin: '4px 0',
};

const infoSection = {
  backgroundColor: '#eff6ff',
  border: '1px solid #3b82f6',
  borderRadius: '6px',
  padding: '16px',
  margin: '20px 0',
  textAlign: 'center' as const,
};

const infoText = {
  color: '#1e40af',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
};

const messageSection = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #22c55e',
  borderRadius: '6px',
  padding: '16px',
  margin: '20px 0',
};

const messageLabel = {
  color: '#15803d',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};

const messageText = {
  color: '#166534',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#f59e0b',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
  cursor: 'pointer',
};

const link = {
  color: '#2563eb',
  fontSize: '14px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
};

const helpSection = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '20px',
  margin: '24px 0',
};

const helpHeading = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const helpText = {
  color: '#4b5563',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '6px 0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const footer = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '12px 0',
  textAlign: 'center' as const,
};