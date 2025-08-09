import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '~/lib/auth';
import { sendEmail, getEmailStatus } from '~/lib/email';
import SignatureRequestEmail from '~/emails/signature-request';
import SignatureReminderEmail from '~/emails/signature-reminder';
import DocumentCompletedEmail from '~/emails/document-completed';

export async function GET() {
  try {
    // Check authentication (optional in development)
    const session = await getServerSession(authOptions);
    
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailStatus = getEmailStatus();
    return NextResponse.json({
      status: 'Email service status',
      ...emailStatus,
    });
  } catch (error) {
    console.error('Error checking email status:', error);
    return NextResponse.json(
      { error: 'Failed to check email status' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check authentication (optional in development)
    const session = await getServerSession(authOptions);
    
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, to, ...templateProps } = body;

    if (!to) {
      return NextResponse.json(
        { error: 'Recipient email address is required' },
        { status: 400 }
      );
    }

    let template;
    let subject;

    switch (type) {
      case 'signature-request':
        template = SignatureRequestEmail({
          recipientName: templateProps.recipientName || 'Test User',
          documentTitle: templateProps.documentTitle || 'Test Document',
          senderName: templateProps.senderName || 'Test Sender',
          signatureUrl: templateProps.signatureUrl || 'https://payflow.app/sign/test-123',
          expiresAt: templateProps.expiresAt ? new Date(templateProps.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          message: templateProps.message,
        });
        subject = `Test: Signature Request - ${templateProps.documentTitle || 'Test Document'}`;
        break;

      case 'signature-reminder':
        template = SignatureReminderEmail({
          recipientName: templateProps.recipientName || 'Test User',
          documentTitle: templateProps.documentTitle || 'Test Document',
          senderName: templateProps.senderName || 'Test Sender',
          signatureUrl: templateProps.signatureUrl || 'https://payflow.app/sign/test-123',
          daysPending: templateProps.daysPending || 3,
          expiresAt: templateProps.expiresAt ? new Date(templateProps.expiresAt) : new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          message: templateProps.message,
        });
        subject = `Test: Reminder - ${templateProps.documentTitle || 'Test Document'}`;
        break;

      case 'document-completed':
        template = DocumentCompletedEmail({
          recipientName: templateProps.recipientName || 'Test User',
          documentTitle: templateProps.documentTitle || 'Test Document',
          completedAt: templateProps.completedAt ? new Date(templateProps.completedAt) : new Date(),
          totalSignatures: templateProps.totalSignatures || 2,
          documentUrl: templateProps.documentUrl || 'https://payflow.app/documents/test-123',
          signers: templateProps.signers || [
            {
              name: 'John Doe',
              email: 'john@example.com',
              signedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
            {
              name: 'Jane Smith',
              email: 'jane@example.com',
              signedAt: new Date(),
            },
          ],
        });
        subject = `Test: Document Completed - ${templateProps.documentTitle || 'Test Document'}`;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid email type. Use: signature-request, signature-reminder, or document-completed' },
          { status: 400 }
        );
    }

    const result = await sendEmail({
      to,
      subject,
      template,
    });

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully`,
      emailId: result?.id,
      type,
      recipient: to,
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}