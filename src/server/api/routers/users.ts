import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/lib/trpc";

export const usersRouter = createTRPCRouter({
  // Get current user profile with extended information
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        sentDocuments: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        _count: {
          select: {
            sentDocuments: true,
            signedDocuments: true,
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User profile not found",
      });
    }

    return user;
  }),

  // Update user profile information
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required").max(100, "Name too long").optional(),
        email: z.string().email("Invalid email address").optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if email is already taken by another user
        if (input.email && input.email !== ctx.session.user.email) {
          const existingUser = await ctx.db.user.findUnique({
            where: { email: input.email },
          });

          if (existingUser && existingUser.id !== ctx.session.user.id) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Email address is already in use",
            });
          }
        }

        const updatedUser = await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: {
            ...input,
            updatedAt: new Date(),
          },
        });

        return updatedUser;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update profile",
          cause: error,
        });
      }
    }),

  // Get user activity summary
  getActivitySummary: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const dateFrom = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

      const [
        documentsCreated,
        documentsSigned,
        recentDocuments,
        recentSignatures
      ] = await Promise.all([
        ctx.db.document.count({
          where: {
            senderId: ctx.session.user.id,
            createdAt: { gte: dateFrom },
          },
        }),
        ctx.db.signature.count({
          where: {
            userId: ctx.session.user.id,
            signedAt: { gte: dateFrom },
            status: "SIGNED",
          },
        }),
        ctx.db.document.findMany({
          where: {
            senderId: ctx.session.user.id,
            createdAt: { gte: dateFrom },
          },
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            _count: {
              select: {
                signatures: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        ctx.db.signature.findMany({
          where: {
            userId: ctx.session.user.id,
            signedAt: { gte: dateFrom },
            status: "SIGNED",
          },
          select: {
            id: true,
            signedAt: true,
            document: {
              select: {
                id: true,
                title: true,
                sender: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { signedAt: "desc" },
          take: 10,
        }),
      ]);

      return {
        period: {
          days: input.days,
          dateFrom,
          dateTo: new Date(),
        },
        summary: {
          documentsCreated,
          documentsSigned,
        },
        recentActivity: {
          documents: recentDocuments,
          signatures: recentSignatures,
        },
      };
    }),

  // Get user preferences/settings
  getPreferences: protectedProcedure.query(async () => {
    // For now, return default preferences
    // In the future, you might want to add a UserPreferences table
    return {
      emailNotifications: {
        documentSigned: true,
        documentExpiring: true,
        remindersSent: true,
      },
      defaultSettings: {
        documentExpiration: 30, // days
        reminderInterval: 3, // days
        autoReminders: true,
      },
      theme: "light",
      language: "en",
    };
  }),

  // Update user preferences
  updatePreferences: protectedProcedure
    .input(
      z.object({
        emailNotifications: z.object({
          documentSigned: z.boolean().optional(),
          documentExpiring: z.boolean().optional(),
          remindersSent: z.boolean().optional(),
        }).optional(),
        defaultSettings: z.object({
          documentExpiration: z.number().min(1).max(365).optional(),
          reminderInterval: z.number().min(1).max(30).optional(),
          autoReminders: z.boolean().optional(),
        }).optional(),
        theme: z.enum(["light", "dark"]).optional(),
        language: z.string().min(2).max(5).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Store these preferences in a UserPreferences table
      // For now, return the updated preferences
      return {
        message: "Preferences updated successfully",
        preferences: input,
      };
    }),

  // Delete user account and all associated data
  deleteAccount: protectedProcedure
    .input(
      z.object({
        confirmation: z.literal("DELETE").refine(
          (value) => value === "DELETE",
          { message: "Please type 'DELETE' to confirm account deletion" }
        ),
      })
    )
    .mutation(async ({ ctx }) => {
      try {
        // This will cascade delete all related documents and signatures
        // due to the foreign key constraints in the schema
        await ctx.db.user.delete({
          where: { id: ctx.session.user.id },
        });

        return {
          success: true,
          message: "Account deleted successfully",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete account",
          cause: error,
        });
      }
    }),

  // Export user data (GDPR compliance)
  exportData: protectedProcedure.query(async ({ ctx }) => {
    const userData = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        sentDocuments: {
          include: {
            signatures: true,
          },
        },
        signedDocuments: {
          include: {
            document: true,
          },
        },
        accounts: true,
        sessions: true,
      },
    });

    if (!userData) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User data not found",
      });
    }

    // Remove sensitive data before export
    const exportData = {
      profile: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      },
      documents: userData.sentDocuments.map((doc) => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        signatures: doc.signatures.map((sig) => ({
          id: sig.id,
          recipientEmail: sig.recipientEmail,
          status: sig.status,
          signedAt: sig.signedAt,
        })),
      })),
      signatures: userData.signedDocuments.map((sig) => ({
        id: sig.id,
        status: sig.status,
        signedAt: sig.signedAt,
        document: {
          id: sig.document.id,
          title: sig.document.title,
        },
      })),
      exportedAt: new Date(),
    };

    return exportData;
  }),
});