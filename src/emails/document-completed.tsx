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

interface DocumentCompletedEmailProps {
  recipientName: string;
  documentTitle: string;
  completedAt: Date;
  totalSignatures: number;
  documentUrl?: string;
  signers?: Array<{
    name: string;
    email: string;
    signedAt: Date;
  }>;
}

export default function DocumentCompletedEmail({
  recipientName,
  documentTitle,
  completedAt,
  totalSignatures,
  documentUrl,
  signers,
}: DocumentCompletedEmailProps) {
  const previewText = `Great news! "${documentTitle}" has been fully signed by all parties`;

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
            <Section style={celebrationSection}>
              <Text style={celebrationEmoji}>🎉</Text>
              <Text style={heading}>Document Completed!</Text>
            </Section>
            
            <Text style={paragraph}>
              Hi {recipientName},
            </Text>
            
            <Text style={paragraph}>
              Great news! Your document has been fully signed by all parties.
            </Text>

            <Section style={documentSection}>
              <Text style={documentTitle}>{documentTitle}</Text>
              <Text style={completionDetails}>
                Completed on {format(completedAt, 'MMMM d, yyyy \'at\' h:mm a')}
              </Text>
              <Text style={completionDetails}>
                Total signatures collected: {totalSignatures}
              </Text>
            </Section>

            {signers && signers.length > 0 && (
              <Section style={signersSection}>
                <Text style={signersHeading}>Signatures:</Text>
                {signers.map((signer, index) => (
                  <div key={index} style={signerItem}>
                    <Text style={signerName}>✓ {signer.name}</Text>
                    <Text style={signerDetails}>
                      {signer.email} • Signed {format(signer.signedAt, 'MMM d, yyyy \'at\' h:mm a')}
                    </Text>
                  </div>
                ))}
              </Section>
            )}

            {documentUrl && (
              <Section style={buttonSection}>
                <Button href={documentUrl} style={button}>
                  Download Completed Document
                </Button>
              </Section>
            )}

            <Section style={infoSection}>
              <Text style={infoText}>
                ✨ <strong>What happens next?</strong>
              </Text>
              <Text style={infoText}>
                • All parties have been notified of the completion
              </Text>
              <Text style={infoText}>
                • The completed document is available in your PayFlow dashboard
              </Text>
              <Text style={infoText}>
                • You can download or share the signed document anytime
              </Text>
            </Section>

            {documentUrl && (
              <>
                <Text style={paragraph}>
                  Or copy and paste this link to access your document:
                </Text>
                <Link href={documentUrl} style={link}>
                  {documentUrl}
                </Link>
              </>
            )}

            <Hr style={hr} />
            
            <Text style={footer}>
              Thank you for using PayFlow for your document signing needs. 
              We're here to help make your workflow as smooth as possible.
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

const celebrationSection = {
  textAlign: 'center' as const,
  margin: '20px 0',
};

const celebrationEmoji = {
  fontSize: '48px',
  margin: '0 0 16px 0',
};

const heading = {
  color: '#059669',
  fontSize: '28px',
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
  backgroundColor: '#ecfdf5',
  border: '1px solid #10b981',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const documentTitle: CSSProperties = {
  color: '#065f46',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const completionDetails = {
  color: '#047857',
  fontSize: '14px',
  margin: '4px 0',
};

const signersSection = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '20px',
  margin: '20px 0',
};

const signersHeading = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px 0',
};

const signerItem = {
  marginBottom: '12px',
};

const signerName = {
  color: '#059669',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 4px 0',
};

const signerDetails = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#059669',
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

const infoSection = {
  backgroundColor: '#eff6ff',
  border: '1px solid #3b82f6',
  borderRadius: '6px',
  padding: '20px',
  margin: '24px 0',
};

const infoText = {
  color: '#1e40af',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '8px 0',
};

const link = {
  color: '#2563eb',
  fontSize: '14px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
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