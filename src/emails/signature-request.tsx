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
  Img,
} from '@react-email/components';
import type { CSSProperties } from 'react';
import { format } from 'date-fns';

interface SignatureRequestEmailProps {
  recipientName: string;
  documentTitle: string;
  senderName: string;
  signatureUrl: string;
  expiresAt?: Date;
  message?: string;
}

export default function SignatureRequestEmail({
  recipientName,
  documentTitle,
  senderName,
  signatureUrl,
  expiresAt,
  message,
}: SignatureRequestEmailProps) {
  const previewText = `${senderName} has requested your signature on "${documentTitle}"`;

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
            <Text style={heading}>Signature Request</Text>
            
            <Text style={paragraph}>
              Hi {recipientName},
            </Text>
            
            <Text style={paragraph}>
              <strong>{senderName}</strong> has requested your signature on the following document:
            </Text>

            <Section style={documentSection}>
              <Text style={documentTitle}>{documentTitle}</Text>
            </Section>

            {message && (
              <Section style={messageSection}>
                <Text style={messageLabel}>Message from {senderName}:</Text>
                <Text style={messageText}>{message}</Text>
              </Section>
            )}

            <Section style={buttonSection}>
              <Button href={signatureUrl} style={button}>
                Review & Sign Document
              </Button>
            </Section>

            <Text style={paragraph}>
              Or copy and paste this link into your browser:
            </Text>
            <Link href={signatureUrl} style={link}>
              {signatureUrl}
            </Link>

            {expiresAt && (
              <Section style={expirationSection}>
                <Text style={expirationText}>
                  ⏰ This signature request expires on {format(expiresAt, 'MMMM d, yyyy \'at\' h:mm a')}
                </Text>
              </Section>
            )}

            <Hr style={hr} />
            
            <Text style={footer}>
              This email was sent by PayFlow on behalf of {senderName}. If you have any questions about this document, please contact the sender directly.
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

const heading = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '30px 0 20px 0',
  textAlign: 'center' as const,
};

const paragraph = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '16px 0',
};

const documentSection = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '20px',
  margin: '20px 0',
  textAlign: 'center' as const,
};

const documentTitle: CSSProperties = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0',
};

const messageSection = {
  backgroundColor: '#fef3c7',
  border: '1px solid #f59e0b',
  borderRadius: '6px',
  padding: '16px',
  margin: '20px 0',
};

const messageLabel = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};

const messageText = {
  color: '#78350f',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#2563eb',
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

const expirationSection = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fca5a5',
  borderRadius: '6px',
  padding: '16px',
  margin: '20px 0',
  textAlign: 'center' as const,
};

const expirationText = {
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
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