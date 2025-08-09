import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/lib/trpc";

export const signaturesRouter = createTRPCRouter({
  // Enhanced bulk operations for signatures
  getByDocumentId: publicProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.signature.findMany({
        where: {
          documentId: input.documentId,
        },
        include: {
          document: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    }),

  // Enhanced with better error handling
  getByEmailAndDocumentId: publicProcedure
    .input(
      z.object({
        documentId: z.string(),
        email: z.string().email(),
      })
    )
    .query(async ({ ctx, input }) => {
      const signature = await ctx.db.signature.findFirst({
        where: {
          documentId: input.documentId,
          recipientEmail: input.email,
        },
        include: {
          document: {
            include: {
              sender: true,
            },
          },
        },
      });

      if (!signature) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Signature request not found",
        });
      }

      // Check if document is expired
      if (signature.document.expiresAt && signature.document.expiresAt < new Date()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Document has expired and can no longer be signed",
        });
      }

      return signature;
    }),

  // Enhanced signing with validation and metadata
  sign: publicProcedure
    .input(
      z.object({
        signatureId: z.string(),
        signatureData: z.string().min(1, "Signature data is required"),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
        geolocation: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // First check if signature exists and is pending
        const existingSignature = await ctx.db.signature.findUnique({
          where: { id: input.signatureId },
          include: { document: true },
        });

        if (!existingSignature) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Signature request not found",
          });
        }

        if (existingSignature.status !== "PENDING") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Signature has already been processed",
          });
        }

        // Check document expiration
        if (existingSignature.document.expiresAt && existingSignature.document.expiresAt < new Date()) {
          await ctx.db.signature.update({
            where: { id: input.signatureId },
            data: { status: "EXPIRED" },
          });

          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Document has expired",
          });
        }

        const signature = await ctx.db.signature.update({
          where: {
            id: input.signatureId,
          },
          data: {
            signatureData: input.signatureData,
            signedAt: new Date(),
            ipAddress: input.ipAddress,
            status: "SIGNED",
          },
          include: {
            document: {
              include: {
                signatures: true,
              },
            },
          },
        });

        // Check if all signatures are completed
        const allSigned = signature.document.signatures.every(
          (sig) => sig.status === "SIGNED"
        );

        if (allSigned) {
          await ctx.db.document.update({
            where: {
              id: signature.documentId,
            },
            data: {
              status: "COMPLETED",
            },
          });
        }

        return signature;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process signature",
          cause: error,
        });
      }
    }),

  decline: publicProcedure
    .input(
      z.object({
        signatureId: z.string(),
        reason: z.string().max(500, "Reason too long").optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const signature = await ctx.db.signature.findUnique({
          where: { id: input.signatureId },
        });

        if (!signature) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Signature request not found",
          });
        }

        if (signature.status !== "PENDING") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Signature has already been processed",
          });
        }

        return ctx.db.signature.update({
          where: {
            id: input.signatureId,
          },
          data: {
            status: "DECLINED",
            // If you want to store the decline reason, you'd add a field to the schema
          },
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to decline signature",
          cause: error,
        });
      }
    }),

  // Bulk resend notifications
  bulkResend: protectedProcedure
    .input(
      z.object({
        signatureIds: z.array(z.string()).min(1, "At least one signature ID required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const signatures = await ctx.db.signature.findMany({
        where: {
          id: { in: input.signatureIds },
          status: "PENDING",
        },
        include: {
          document: true,
        },
      });

      // Verify user owns all documents
      const unauthorizedSignatures = signatures.filter(
        (sig) => sig.document.senderId !== ctx.session.user.id
      );

      if (unauthorizedSignatures.length > 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to resend some of these signatures",
        });
      }

      const updatedSignatures = await Promise.all(
        signatures.map((signature) =>
          ctx.db.signature.update({
            where: { id: signature.id },
            data: { updatedAt: new Date() },
          })
        )
      );

      // TODO: Implement actual email sending logic here

      return {
        count: updatedSignatures.length,
        message: `Resent ${updatedSignatures.length} signature requests`,
      };
    }),

  resend: protectedProcedure
    .input(z.object({ signatureId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const signature = await ctx.db.signature.findFirst({
          where: {
            id: input.signatureId,
          },
          include: {
            document: true,
          },
        });

        if (!signature) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Signature not found",
          });
        }

        if (signature.document.senderId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to resend this signature",
          });
        }

        if (signature.status !== "PENDING") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Can only resend pending signatures",
          });
        }

        // TODO: Implement email sending logic here
        return ctx.db.signature.update({
          where: {
            id: input.signatureId,
          },
          data: {
            updatedAt: new Date(),
          },
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to resend signature request",
          cause: error,
        });
      }
    }),

  // Set signature deadline
  setDeadline: protectedProcedure
    .input(
      z.object({
        signatureIds: z.array(z.string()).min(1),
        deadline: z.date().min(new Date(), "Deadline must be in the future"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const signatures = await ctx.db.signature.findMany({
        where: {
          id: { in: input.signatureIds },
        },
        include: {
          document: true,
        },
      });

      // Verify ownership
      const unauthorizedSignatures = signatures.filter(
        (sig) => sig.document.senderId !== ctx.session.user.id
      );

      if (unauthorizedSignatures.length > 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to modify some of these signatures",
        });
      }

      // Update document expiration dates
      const documentIds = [...new Set(signatures.map((sig) => sig.documentId))];
      
      await ctx.db.document.updateMany({
        where: {
          id: { in: documentIds },
        },
        data: {
          expiresAt: input.deadline,
        },
      });

      return {
        updatedDocuments: documentIds.length,
        message: `Set deadline for ${documentIds.length} documents`,
      };
    }),

  // Get signature statistics for user's documents
  getSignatureStats: protectedProcedure
    .input(
      z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), dateTo = new Date() } = input;

      const [
        totalSignatures,
        signedCount,
        pendingCount,
        declinedCount,
        averageSigningTime
      ] = await Promise.all([
        ctx.db.signature.count({
          where: {
            document: { senderId: ctx.session.user.id },
            createdAt: { gte: dateFrom, lte: dateTo }
          }
        }),
        ctx.db.signature.count({
          where: {
            document: { senderId: ctx.session.user.id },
            status: "SIGNED",
            createdAt: { gte: dateFrom, lte: dateTo }
          }
        }),
        ctx.db.signature.count({
          where: {
            document: { senderId: ctx.session.user.id },
            status: "PENDING",
            createdAt: { gte: dateFrom, lte: dateTo }
          }
        }),
        ctx.db.signature.count({
          where: {
            document: { senderId: ctx.session.user.id },
            status: "DECLINED",
            createdAt: { gte: dateFrom, lte: dateTo }
          }
        }),
        // TODO: Calculate actual average signing time
        Promise.resolve(null)
      ]);

      return {
        totalSignatures,
        signedCount,
        pendingCount,
        declinedCount,
        signedRate: totalSignatures > 0 ? (signedCount / totalSignatures) * 100 : 0,
        declineRate: totalSignatures > 0 ? (declinedCount / totalSignatures) * 100 : 0,
        averageSigningTime, // TODO: Implement this calculation
        dateRange: { dateFrom, dateTo }
      };
    }),

  // Cancel signatures (before expiration)
  cancelSignatures: protectedProcedure
    .input(
      z.object({
        signatureIds: z.array(z.string()).min(1),
        reason: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const signatures = await ctx.db.signature.findMany({
        where: {
          id: { in: input.signatureIds },
          status: "PENDING",
        },
        include: {
          document: true,
        },
      });

      // Verify ownership
      const unauthorizedSignatures = signatures.filter(
        (sig) => sig.document.senderId !== ctx.session.user.id
      );

      if (unauthorizedSignatures.length > 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to cancel some of these signatures",
        });
      }

      // Update signatures to expired status
      await ctx.db.signature.updateMany({
        where: {
          id: { in: input.signatureIds },
        },
        data: {
          status: "EXPIRED",
        },
      });

      return {
        canceledCount: signatures.length,
        message: `Canceled ${signatures.length} signature requests`,
      };
    }),

  // Get reminder candidates (signatures pending for X days)
  getReminderCandidates: protectedProcedure
    .input(
      z.object({
        daysSinceSent: z.number().min(1).default(3),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const cutoffDate = new Date(Date.now() - input.daysSinceSent * 24 * 60 * 60 * 1000);

      return ctx.db.signature.findMany({
        where: {
          document: { senderId: ctx.session.user.id },
          status: "PENDING",
          createdAt: { lte: cutoffDate },
        },
        include: {
          document: {
            select: {
              id: true,
              title: true,
              expiresAt: true,
            },
          },
        },
        take: input.limit,
        orderBy: {
          createdAt: "asc",
        },
      });
    }),
});