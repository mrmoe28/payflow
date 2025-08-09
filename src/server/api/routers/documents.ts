import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/lib/trpc";
import { sendEmailSafe } from "~/lib/email";
import SignatureRequestEmail from "~/emails/signature-request";

export const documentsRouter = createTRPCRouter({
  // Enhanced dashboard statistics
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    const [
      totalDocuments,
      draftDocuments,
      sentDocuments,
      completedDocuments,
      pendingSignatures,
      recentActivity
    ] = await Promise.all([
      ctx.db.document.count({ where: { senderId: userId } }),
      ctx.db.document.count({ where: { senderId: userId, status: "DRAFT" } }),
      ctx.db.document.count({ where: { senderId: userId, status: "SENT" } }),
      ctx.db.document.count({ where: { senderId: userId, status: "COMPLETED" } }),
      ctx.db.signature.count({
        where: {
          document: { senderId: userId },
          status: "PENDING"
        }
      }),
      ctx.db.document.findMany({
        where: { senderId: userId },
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: {
          signatures: {
            select: {
              status: true,
              recipientEmail: true,
              signedAt: true
            }
          }
        }
      })
    ]);

    return {
      totalDocuments,
      draftDocuments,
      sentDocuments,
      completedDocuments,
      pendingSignatures,
      recentActivity,
      completionRate: totalDocuments > 0 ? (completedDocuments / totalDocuments) * 100 : 0
    };
  }),

  // Enhanced search with filters
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().optional(),
        status: z.enum(["DRAFT", "SENT", "COMPLETED", "EXPIRED", "CANCELLED"]).optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        sortBy: z.enum(["createdAt", "updatedAt", "title"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc")
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, status, dateFrom, dateTo, page, limit, sortBy, sortOrder } = input;
      const offset = (page - 1) * limit;

      const whereClause: Record<string, unknown> = {
        senderId: ctx.session.user.id,
        ...(status && { status }),
        ...(dateFrom && dateTo && {
          createdAt: {
            gte: dateFrom,
            lte: dateTo
          }
        }),
        ...(query && {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { fileName: { contains: query, mode: "insensitive" } }
          ]
        })
      };

      const [documents, total] = await Promise.all([
        ctx.db.document.findMany({
          where: whereClause,
          include: {
            signatures: {
              select: {
                id: true,
                status: true,
                recipientEmail: true,
                signedAt: true
              }
            }
          },
          orderBy: { [sortBy]: sortOrder },
          skip: offset,
          take: limit
        }),
        ctx.db.document.count({ where: whereClause })
      ]);

      return {
        documents,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.document.findMany({
      where: {
        senderId: ctx.session.user.id,
      },
      include: {
        signatures: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const document = await ctx.db.document.findFirst({
        where: {
          id: input.id,
          senderId: ctx.session.user.id,
        },
        include: {
          signatures: true,
          sender: true,
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found or you don't have permission to access it",
        });
      }

      return document;
    }),

  // Enhanced create with file upload validation
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required").max(200, "Title too long"),
        description: z.string().max(1000, "Description too long").optional(),
        fileUrl: z.string().url("Invalid file URL"),
        fileName: z.string().min(1, "File name is required"),
        fileSize: z.number().positive("File size must be positive").max(50 * 1024 * 1024, "File too large (max 50MB)"),
        mimeType: z.string().refine(
          (type) => [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "image/jpeg",
            "image/png"
          ].includes(type),
          "Unsupported file type"
        ),
        recipients: z.array(
          z.object({
            email: z.string().email("Invalid email address"),
            name: z.string().optional(),
          })
        ).min(1, "At least one recipient is required").max(10, "Too many recipients (max 10)"),
        expiresAt: z.date().min(new Date(), "Expiration date must be in the future").optional(),
        sendImmediately: z.boolean().default(false)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { recipients, sendImmediately, ...documentData } = input;

      try {
        const document = await ctx.db.document.create({
          data: {
            ...documentData,
            senderId: ctx.session.user.id,
            status: sendImmediately ? "SENT" : "DRAFT",
            signatures: {
              create: recipients.map((recipient) => ({
                recipientEmail: recipient.email,
                recipientName: recipient.name,
              })),
            },
          },
          include: {
            signatures: true,
            sender: true,
          },
        });

        // Send email notifications if sendImmediately is true
        if (sendImmediately && document.signatures.length > 0) {
          await Promise.all(
            document.signatures.map(async (signature) => {
              return sendEmailSafe({
                to: signature.recipientEmail,
                subject: `Signature Request: ${document.title}`,
                template: SignatureRequestEmail({
                  recipientName: signature.recipientName || signature.recipientEmail,
                  documentTitle: document.title,
                  senderName: document.sender?.name || 'PayFlow User',
                  signatureUrl: `${process.env.NEXTAUTH_URL}/sign/${signature.id}`,
                  expiresAt: document.expiresAt || undefined,
                }),
              });
            })
          );
        }

        return document;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create document",
          cause: error,
        });
      }
    }),

  // Batch update multiple documents
  batchUpdateStatus: protectedProcedure
    .input(
      z.object({
        documentIds: z.array(z.string()).min(1, "At least one document ID required"),
        status: z.enum(["DRAFT", "SENT", "COMPLETED", "EXPIRED", "CANCELLED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { documentIds, status } = input;

      try {
        const updatedDocuments = await ctx.db.document.updateMany({
          where: {
            id: { in: documentIds },
            senderId: ctx.session.user.id,
          },
          data: {
            status,
            updatedAt: new Date(),
          },
        });

        return {
          count: updatedDocuments.count,
          message: `Updated ${updatedDocuments.count} documents to ${status}`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update documents",
          cause: error,
        });
      }
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["DRAFT", "SENT", "COMPLETED", "EXPIRED", "CANCELLED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const document = await ctx.db.document.findFirst({
          where: { id: input.id, senderId: ctx.session.user.id },
        });

        if (!document) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Document not found",
          });
        }

        return ctx.db.document.update({
          where: { id: input.id },
          data: { status: input.status },
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update document status",
          cause: error,
        });
      }
    }),

  // Enhanced update with validation
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1, "Title is required").max(200, "Title too long").optional(),
        description: z.string().max(1000, "Description too long").optional(),
        expiresAt: z.date().min(new Date(), "Expiration date must be in the future").optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      try {
        return await ctx.db.document.update({
          where: {
            id,
            senderId: ctx.session.user.id,
          },
          data: updateData,
          include: {
            signatures: true,
          },
        });
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found or you don't have permission to update it",
          cause: error,
        });
      }
    }),

  // Duplicate document
  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const originalDocument = await ctx.db.document.findFirst({
        where: {
          id: input.id,
          senderId: ctx.session.user.id,
        },
        include: {
          signatures: true,
        },
      });

      if (!originalDocument) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const duplicatedDocument = await ctx.db.document.create({
        data: {
          title: `Copy of ${originalDocument.title}`,
          description: originalDocument.description,
          fileUrl: originalDocument.fileUrl,
          fileName: originalDocument.fileName,
          fileSize: originalDocument.fileSize,
          mimeType: originalDocument.mimeType,
          senderId: ctx.session.user.id,
          status: "DRAFT",
          signatures: {
            create: originalDocument.signatures.map((sig) => ({
              recipientEmail: sig.recipientEmail,
              recipientName: sig.recipientName,
            })),
          },
        },
        include: {
          signatures: true,
        },
      });

      return duplicatedDocument;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.document.delete({
          where: {
            id: input.id,
            senderId: ctx.session.user.id,
          },
        });
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found or you don't have permission to delete it",
          cause: error,
        });
      }
    }),

  // Batch delete multiple documents
  batchDelete: protectedProcedure
    .input(z.object({ documentIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const deletedDocuments = await ctx.db.document.deleteMany({
          where: {
            id: { in: input.documentIds },
            senderId: ctx.session.user.id,
          },
        });

        return {
          count: deletedDocuments.count,
          message: `Deleted ${deletedDocuments.count} documents`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete documents",
          cause: error,
        });
      }
    }),

  // Get document analytics
  getAnalytics: protectedProcedure
    .input(
      z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), dateTo = new Date() } = input;

      const [
        documentsByStatus,
        signaturesByStatus,
        dailyCreations
      ] = await Promise.all([
        ctx.db.document.groupBy({
          by: ["status"],
          where: {
            senderId: ctx.session.user.id,
            createdAt: { gte: dateFrom, lte: dateTo }
          },
          _count: { status: true }
        }),
        ctx.db.signature.groupBy({
          by: ["status"],
          where: {
            document: { senderId: ctx.session.user.id },
            createdAt: { gte: dateFrom, lte: dateTo }
          },
          _count: { status: true }
        }),
        ctx.db.$queryRaw`
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM "Document"
          WHERE sender_id = ${ctx.session.user.id}
          AND created_at >= ${dateFrom}
          AND created_at <= ${dateTo}
          GROUP BY DATE(created_at)
          ORDER BY date
        `
      ]);

      return {
        documentsByStatus,
        signaturesByStatus,
        dailyCreations,
        averageCompletionTime: null, // TODO: Implement completion time calculation
        dateRange: { dateFrom, dateTo }
      };
    }),
});