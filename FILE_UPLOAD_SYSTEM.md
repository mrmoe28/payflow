# PayFlow File Upload System Architecture

## Overview

This document outlines the recommended file upload system architecture for PayFlow, designed to handle secure document storage and processing for digital signature workflows.

## Architecture Components

### 1. Upload Service Layer
- **Primary Storage**: AWS S3 or Uploadthing for secure document storage
- **CDN**: CloudFront for global document delivery
- **Backup**: Cross-region replication for disaster recovery

### 2. Processing Pipeline
```
Client Upload → Validation → Virus Scan → Storage → Processing → Database Record
```

### 3. Security Measures
- File type validation (PDF, DOCX, PNG, JPEG only)
- File size limits (50MB maximum)
- Virus scanning before storage
- Encrypted storage at rest
- Signed URLs for temporary access

## Implementation Recommendations

### File Upload Flow
1. **Pre-upload Validation**
   - Client-side file type/size checks
   - Generate secure upload token
   - Create placeholder database record

2. **Upload Processing**
   - Direct upload to storage service
   - Server-side validation webhook
   - Virus scanning integration
   - Thumbnail generation for images

3. **Post-upload Actions**
   - Update database record with file metadata
   - Generate document preview
   - Initialize signature workflow

### Storage Structure
```
/documents/
  /{userId}/
    /{documentId}/
      /original/{filename}
      /processed/{filename}
      /thumbnails/{size}_{filename}
```

### Database Schema Enhancements
```sql
-- Add to Document table
ALTER TABLE "Document" ADD COLUMN "processingStatus" TEXT DEFAULT 'pending';
ALTER TABLE "Document" ADD COLUMN "thumbnailUrl" TEXT;
ALTER TABLE "Document" ADD COLUMN "previewUrl" TEXT;
ALTER TABLE "Document" ADD COLUMN "storageKey" TEXT;
ALTER TABLE "Document" ADD COLUMN "virusScanStatus" TEXT DEFAULT 'pending';
ALTER TABLE "Document" ADD COLUMN "uploadCompletedAt" TIMESTAMP;

-- File processing audit table
CREATE TABLE "FileProcessingLog" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  documentId TEXT NOT NULL REFERENCES "Document"(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  errorMessage TEXT,
  processingTimeMs INTEGER,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

## Integration Points

### 1. Upload Service Integration
```typescript
// Example with Uploadthing
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  documentUploader: f({
    pdf: { maxFileSize: "50MB", maxFileCount: 1 },
    image: { maxFileSize: "10MB", maxFileCount: 1 },
  })
    .middleware(async ({ req }) => {
      // Authenticate user and validate permissions
      const session = await getServerAuthSession();
      if (!session?.user) throw new Error("Unauthorized");
      
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Create document record and trigger processing
      await processUploadedDocument({
        userId: metadata.userId,
        fileUrl: file.url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
    }),
} satisfies FileRouter;
```

### 2. Virus Scanning
```typescript
// Integration with ClamAV or cloud service
export async function scanDocument(fileUrl: string): Promise<{
  safe: boolean;
  threats: string[];
}> {
  // Implement virus scanning logic
  // Return scan results
}
```

### 3. Document Processing
```typescript
// PDF processing and thumbnail generation
export async function processDocument(documentId: string) {
  try {
    // Update processing status
    await updateDocumentStatus(documentId, "processing");
    
    // Generate thumbnails
    const thumbnailUrl = await generateThumbnail(documentId);
    
    // Create preview
    const previewUrl = await generatePreview(documentId);
    
    // Update document record
    await updateDocumentProcessing(documentId, {
      processingStatus: "completed",
      thumbnailUrl,
      previewUrl,
      uploadCompletedAt: new Date(),
    });
    
  } catch (error) {
    await updateDocumentStatus(documentId, "failed");
    throw error;
  }
}
```

## Enhanced tRPC Procedures

### Upload Initialization
```typescript
initiateUpload: protectedProcedure
  .input(
    z.object({
      fileName: z.string(),
      fileSize: z.number(),
      mimeType: z.string(),
      checksum: z.string().optional(), // For integrity verification
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Validate file constraints
    validateFileUpload(input);
    
    // Create placeholder document
    const document = await ctx.db.document.create({
      data: {
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        senderId: ctx.session.user.id,
        processingStatus: "pending_upload",
        // Generate secure upload token
        uploadToken: generateSecureToken(),
      },
    });
    
    return {
      documentId: document.id,
      uploadToken: document.uploadToken,
      uploadUrl: await generateUploadUrl(document.id),
    };
  })
```

### Upload Completion
```typescript
completeUpload: protectedProcedure
  .input(
    z.object({
      documentId: z.string(),
      uploadToken: z.string(),
      fileUrl: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Verify upload token
    const document = await verifyUploadToken(input.documentId, input.uploadToken);
    
    // Update document with file URL
    const updatedDocument = await ctx.db.document.update({
      where: { id: input.documentId },
      data: {
        fileUrl: input.fileUrl,
        processingStatus: "uploaded",
        uploadCompletedAt: new Date(),
      },
    });
    
    // Trigger background processing
    await triggerDocumentProcessing(input.documentId);
    
    return updatedDocument;
  })
```

## Error Handling

### Upload Failures
- Retry mechanism for network issues
- Partial upload recovery
- Clear error messages for users
- Cleanup of incomplete uploads

### Processing Failures
- Automatic retry for transient errors
- Manual retry option for users
- Detailed error logging
- Fallback processing options

## Monitoring and Analytics

### Key Metrics
- Upload success rate
- Processing time distribution
- File type usage patterns
- Storage usage trends
- Error rates by type

### Alerts
- High failure rates
- Unusual file types/sizes
- Virus detections
- Storage capacity thresholds

## Security Considerations

### Access Control
- Signed URLs with expiration
- User-based access controls
- Document encryption in transit/rest
- Audit logging for all access

### Compliance
- GDPR data retention policies
- SOC 2 compliance requirements
- Document integrity verification
- Secure deletion procedures

## Performance Optimization

### Caching Strategy
- CDN caching for processed documents
- Browser caching for thumbnails
- Database query optimization
- Connection pooling

### Scalability
- Auto-scaling upload workers
- Queue-based processing
- Horizontal database scaling
- Load balancing strategies

## Implementation Phases

### Phase 1: Basic Upload
- File validation and storage
- Database integration
- Basic error handling

### Phase 2: Processing Pipeline
- Thumbnail generation
- Virus scanning
- Preview creation

### Phase 3: Advanced Features
- Batch uploads
- Progressive upload UI
- Advanced analytics
- Compliance features

## Cost Optimization

### Storage Tiers
- Frequent access tier for recent documents
- Infrequent access tier for older documents
- Archive tier for completed documents

### Processing Optimization
- Lazy thumbnail generation
- Batch processing schedules
- Resource usage monitoring