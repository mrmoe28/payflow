import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/lib/trpc";

export const analyticsRouter = createTRPCRouter({
  // Comprehensive dashboard overview
  getDashboardOverview: protectedProcedure
    .input(
      z.object({
        period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
        timezone: z.string().default("UTC"),
      })
    )
    .query(async ({ ctx, input }) => {
      const days = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
        "1y": 365,
      }[input.period];

      const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [
        totalDocuments,
        totalSignatures,
        completionRate,
        avgSigningTime,
        documentTrends,
        statusDistribution,
        topRecipients
      ] = await Promise.all([
        // Total documents in period
        ctx.db.document.count({
          where: {
            senderId: ctx.session.user.id,
            createdAt: { gte: dateFrom },
          },
        }),

        // Total signature requests in period
        ctx.db.signature.count({
          where: {
            document: { senderId: ctx.session.user.id },
            createdAt: { gte: dateFrom },
          },
        }),

        // Completion rate calculation
        ctx.db.document.aggregate({
          where: {
            senderId: ctx.session.user.id,
            createdAt: { gte: dateFrom },
          },
          _count: true,
        }).then(async (total) => {
          const completed = await ctx.db.document.count({
            where: {
              senderId: ctx.session.user.id,
              status: "COMPLETED",
              createdAt: { gte: dateFrom },
            },
          });
          return total._count > 0 ? (completed / total._count) * 100 : 0;
        }),

        // Average signing time (simplified calculation)
        ctx.db.$queryRaw<[{ avg_hours: number | null }]>`
          SELECT AVG(EXTRACT(EPOCH FROM (signed_at - created_at))/3600) as avg_hours
          FROM "Signature" s
          JOIN "Document" d ON s.document_id = d.id
          WHERE d.sender_id = ${ctx.session.user.id}
          AND s.status = 'SIGNED'
          AND s.created_at >= ${dateFrom}
          AND s.signed_at IS NOT NULL
        `.then((result) => result[0]?.avg_hours || null),

        // Document creation trends (daily)
        ctx.db.$queryRaw<Array<{ date: string; count: number }>>`
          SELECT DATE(created_at) as date, COUNT(*)::integer as count
          FROM "Document"
          WHERE sender_id = ${ctx.session.user.id}
          AND created_at >= ${dateFrom}
          GROUP BY DATE(created_at)
          ORDER BY date
        `,

        // Document status distribution
        ctx.db.document.groupBy({
          by: ["status"],
          where: {
            senderId: ctx.session.user.id,
            createdAt: { gte: dateFrom },
          },
          _count: { status: true },
        }),

        // Top recipients by document count
        ctx.db.$queryRaw<Array<{ email: string; name: string | null; count: number }>>`
          SELECT recipient_email as email, recipient_name as name, COUNT(*)::integer as count
          FROM "Signature" s
          JOIN "Document" d ON s.document_id = d.id
          WHERE d.sender_id = ${ctx.session.user.id}
          AND s.created_at >= ${dateFrom}
          GROUP BY recipient_email, recipient_name
          ORDER BY count DESC
          LIMIT 10
        `,
      ]);

      return {
        period: input.period,
        dateRange: { from: dateFrom, to: new Date() },
        metrics: {
          totalDocuments,
          totalSignatures,
          completionRate: Math.round(completionRate * 100) / 100,
          avgSigningTimeHours: avgSigningTime ? Math.round(avgSigningTime * 100) / 100 : null,
        },
        trends: {
          documentCreations: documentTrends,
          statusDistribution,
        },
        insights: {
          topRecipients: topRecipients.map((recipient) => ({
            email: recipient.email,
            name: recipient.name || "Unknown",
            documentCount: recipient.count,
          })),
        },
      };
    }),

  // Performance metrics over time
  getPerformanceMetrics: protectedProcedure
    .input(
      z.object({
        period: z.enum(["30d", "90d", "1y"]).default("30d"),
        granularity: z.enum(["day", "week", "month"]).default("day"),
      })
    )
    .query(async ({ ctx, input }) => {
      const days = { "30d": 30, "90d": 90, "1y": 365 }[input.period];
      const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const groupBy = {
        day: "DATE(created_at)",
        week: "DATE_TRUNC('week', created_at)",
        month: "DATE_TRUNC('month', created_at)",
      }[input.granularity];

      const [documentMetrics, signatureMetrics] = await Promise.all([
        // Document creation and completion over time
        ctx.db.$queryRaw<Array<{ period: string; created: number; completed: number }>>`
          SELECT 
            ${groupBy} as period,
            COUNT(*)::integer as created,
            COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::integer as completed
          FROM "Document"
          WHERE sender_id = ${ctx.session.user.id}
          AND created_at >= ${dateFrom}
          GROUP BY ${groupBy}
          ORDER BY period
        `,

        // Signature performance over time
        ctx.db.$queryRaw<Array<{ period: string; sent: number; signed: number; declined: number }>>`
          SELECT 
            ${groupBy} as period,
            COUNT(*)::integer as sent,
            COUNT(CASE WHEN status = 'SIGNED' THEN 1 END)::integer as signed,
            COUNT(CASE WHEN status = 'DECLINED' THEN 1 END)::integer as declined
          FROM "Signature" s
          JOIN "Document" d ON s.document_id = d.id
          WHERE d.sender_id = ${ctx.session.user.id}
          AND s.created_at >= ${dateFrom}
          GROUP BY ${groupBy}
          ORDER BY period
        `,
      ]);

      return {
        period: input.period,
        granularity: input.granularity,
        documentMetrics: documentMetrics.map((metric) => ({
          ...metric,
          completionRate: metric.created > 0 ? (metric.completed / metric.created) * 100 : 0,
        })),
        signatureMetrics: signatureMetrics.map((metric) => ({
          ...metric,
          signedRate: metric.sent > 0 ? (metric.signed / metric.sent) * 100 : 0,
          declineRate: metric.sent > 0 ? (metric.declined / metric.sent) * 100 : 0,
        })),
      };
    }),

  // Recipient analytics
  getRecipientAnalytics: protectedProcedure
    .input(
      z.object({
        period: z.enum(["30d", "90d", "1y"]).default("90d"),
        limit: z.number().min(5).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const days = { "30d": 30, "90d": 90, "1y": 365 }[input.period];
      const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const recipientStats = await ctx.db.$queryRaw<Array<{
        email: string;
        name: string | null;
        total_requests: number;
        signed_count: number;
        declined_count: number;
        pending_count: number;
        avg_response_hours: number | null;
      }>>`
        SELECT 
          recipient_email as email,
          recipient_name as name,
          COUNT(*)::integer as total_requests,
          COUNT(CASE WHEN status = 'SIGNED' THEN 1 END)::integer as signed_count,
          COUNT(CASE WHEN status = 'DECLINED' THEN 1 END)::integer as declined_count,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::integer as pending_count,
          AVG(
            CASE WHEN status = 'SIGNED' AND signed_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (signed_at - s.created_at))/3600
            END
          ) as avg_response_hours
        FROM "Signature" s
        JOIN "Document" d ON s.document_id = d.id
        WHERE d.sender_id = ${ctx.session.user.id}
        AND s.created_at >= ${dateFrom}
        GROUP BY recipient_email, recipient_name
        HAVING COUNT(*) >= 2
        ORDER BY total_requests DESC, signed_count DESC
        LIMIT ${input.limit}
      `;

      const enhancedStats = recipientStats.map((stat) => {
        const responseRate = stat.total_requests > 0 ? (stat.signed_count / stat.total_requests) * 100 : 0;
        const declineRate = stat.total_requests > 0 ? (stat.declined_count / stat.total_requests) * 100 : 0;
        
        let performanceScore = 0;
        if (stat.total_requests > 0) {
          performanceScore = responseRate * 0.7; // 70% weight for response rate
          if (stat.avg_response_hours && stat.avg_response_hours < 24) {
            performanceScore += 20; // Bonus for quick responses
          }
          if (declineRate < 10) {
            performanceScore += 10; // Bonus for low decline rate
          }
        }

        return {
          email: stat.email,
          name: stat.name || "Unknown",
          totalRequests: stat.total_requests,
          signedCount: stat.signed_count,
          declinedCount: stat.declined_count,
          pendingCount: stat.pending_count,
          responseRate: Math.round(responseRate * 100) / 100,
          declineRate: Math.round(declineRate * 100) / 100,
          avgResponseHours: stat.avg_response_hours ? Math.round(stat.avg_response_hours * 100) / 100 : null,
          performanceScore: Math.min(Math.round(performanceScore), 100), // Cap at 100
        };
      });

      return {
        period: input.period,
        recipients: enhancedStats,
        summary: {
          totalRecipients: enhancedStats.length,
          averageResponseRate: enhancedStats.length > 0 
            ? enhancedStats.reduce((sum, r) => sum + r.responseRate, 0) / enhancedStats.length
            : 0,
          topPerformers: enhancedStats
            .filter(r => r.performanceScore >= 70)
            .slice(0, 5),
        },
      };
    }),

  // Document type analysis
  getDocumentAnalytics: protectedProcedure
    .input(
      z.object({
        period: z.enum(["30d", "90d", "1y"]).default("90d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const days = { "30d": 30, "90d": 90, "1y": 365 }[input.period];
      const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [
        fileTypeDistribution,
        fileSizeAnalysis,
        completionTimeBySize,
        statusProgression
      ] = await Promise.all([
        // File type distribution
        ctx.db.document.groupBy({
          by: ["mimeType"],
          where: {
            senderId: ctx.session.user.id,
            createdAt: { gte: dateFrom },
          },
          _count: { mimeType: true },
          _avg: { fileSize: true },
        }),

        // File size analysis
        ctx.db.$queryRaw<Array<{ size_range: string; count: number; avg_completion_rate: number }>>`
          SELECT 
            CASE 
              WHEN file_size < 1024*1024 THEN 'Small (<1MB)'
              WHEN file_size < 5*1024*1024 THEN 'Medium (1-5MB)'
              WHEN file_size < 10*1024*1024 THEN 'Large (5-10MB)'
              ELSE 'Extra Large (>10MB)'
            END as size_range,
            COUNT(*)::integer as count,
            (COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::float / COUNT(*) * 100) as avg_completion_rate
          FROM "Document"
          WHERE sender_id = ${ctx.session.user.id}
          AND created_at >= ${dateFrom}
          GROUP BY size_range
          ORDER BY 
            CASE size_range
              WHEN 'Small (<1MB)' THEN 1
              WHEN 'Medium (1-5MB)' THEN 2
              WHEN 'Large (5-10MB)' THEN 3
              ELSE 4
            END
        `,

        // Completion time analysis by file size
        ctx.db.$queryRaw<Array<{ size_range: string; avg_hours: number | null }>>`
          SELECT 
            CASE 
              WHEN d.file_size < 1024*1024 THEN 'Small (<1MB)'
              WHEN d.file_size < 5*1024*1024 THEN 'Medium (1-5MB)'
              WHEN d.file_size < 10*1024*1024 THEN 'Large (5-10MB)'
              ELSE 'Extra Large (>10MB)'
            END as size_range,
            AVG(EXTRACT(EPOCH FROM (s.signed_at - s.created_at))/3600) as avg_hours
          FROM "Signature" s
          JOIN "Document" d ON s.document_id = d.id
          WHERE d.sender_id = ${ctx.session.user.id}
          AND s.status = 'SIGNED'
          AND s.signed_at IS NOT NULL
          AND s.created_at >= ${dateFrom}
          GROUP BY size_range
        `,

        // Document status progression over time
        ctx.db.$queryRaw<Array<{ week: string; draft: number; sent: number; completed: number; expired: number }>>`
          SELECT 
            DATE_TRUNC('week', created_at) as week,
            COUNT(CASE WHEN status = 'DRAFT' THEN 1 END)::integer as draft,
            COUNT(CASE WHEN status = 'SENT' THEN 1 END)::integer as sent,
            COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::integer as completed,
            COUNT(CASE WHEN status = 'EXPIRED' THEN 1 END)::integer as expired
          FROM "Document"
          WHERE sender_id = ${ctx.session.user.id}
          AND created_at >= ${dateFrom}
          GROUP BY DATE_TRUNC('week', created_at)
          ORDER BY week
        `,
      ]);

      return {
        period: input.period,
        fileTypes: fileTypeDistribution.map((type) => ({
          mimeType: type.mimeType,
          count: type._count.mimeType,
          avgFileSize: type._avg.fileSize ? Math.round(type._avg.fileSize) : 0,
          displayName: getFileTypeDisplayName(type.mimeType),
        })),
        fileSizeAnalysis: fileSizeAnalysis.map((analysis) => ({
          sizeRange: analysis.size_range,
          documentCount: analysis.count,
          completionRate: Math.round(analysis.avg_completion_rate * 100) / 100,
        })),
        completionTimeBySize: completionTimeBySize.map((time) => ({
          sizeRange: time.size_range,
          avgCompletionHours: time.avg_hours ? Math.round(time.avg_hours * 100) / 100 : null,
        })),
        statusProgression: statusProgression.map((week) => ({
          week: week.week,
          draft: week.draft,
          sent: week.sent,
          completed: week.completed,
          expired: week.expired,
        })),
      };
    }),

  // Export analytics data for external analysis
  exportAnalytics: protectedProcedure
    .input(
      z.object({
        period: z.enum(["30d", "90d", "1y"]).default("90d"),
        includeRecipientData: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const days = { "30d": 30, "90d": 90, "1y": 365 }[input.period];
      const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [documents, signatures] = await Promise.all([
        ctx.db.document.findMany({
          where: {
            senderId: ctx.session.user.id,
            createdAt: { gte: dateFrom },
          },
          select: {
            id: true,
            title: true,
            status: true,
            fileSize: true,
            mimeType: true,
            createdAt: true,
            updatedAt: true,
            expiresAt: true,
            _count: {
              select: {
                signatures: true,
              },
            },
          },
        }),
        
        input.includeRecipientData
          ? ctx.db.signature.findMany({
              where: {
                document: { senderId: ctx.session.user.id },
                createdAt: { gte: dateFrom },
              },
              select: {
                id: true,
                recipientEmail: input.includeRecipientData,
                status: true,
                createdAt: true,
                signedAt: true,
                documentId: true,
              },
            })
          : [],
      ]);

      return {
        exportedAt: new Date(),
        period: input.period,
        dateRange: { from: dateFrom, to: new Date() },
        data: {
          documents: documents.map((doc) => ({
            ...doc,
            signatureCount: doc._count.signatures,
          })),
          signatures: input.includeRecipientData ? signatures : [],
        },
        summary: {
          totalDocuments: documents.length,
          totalSignatures: signatures.length,
          completedDocuments: documents.filter(d => d.status === "COMPLETED").length,
        },
      };
    }),
});

// Helper function to get display names for MIME types
function getFileTypeDisplayName(mimeType: string): string {
  const typeMap: Record<string, string> = {
    "application/pdf": "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "image/jpeg": "JPEG Image",
    "image/png": "PNG Image",
  };
  
  return typeMap[mimeType] || mimeType;
}