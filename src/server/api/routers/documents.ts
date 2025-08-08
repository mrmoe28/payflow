import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/lib/trpc";

export const documentsRouter = createTRPCRouter({
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
        throw new Error("Document not found");
      }

      return document;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        fileUrl: z.string().url(),
        fileName: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
        recipients: z.array(
          z.object({
            email: z.string().email(),
            name: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { recipients, ...documentData } = input;

      const document = await ctx.db.document.create({
        data: {
          ...documentData,
          senderId: ctx.session.user.id,
          signatures: {
            create: recipients.map((recipient) => ({
              recipientEmail: recipient.email,
              recipientName: recipient.name,
            })),
          },
        },
        include: {
          signatures: true,
        },
      });

      return document;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["DRAFT", "SENT", "COMPLETED", "EXPIRED", "CANCELLED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.document.update({
        where: {
          id: input.id,
          senderId: ctx.session.user.id,
        },
        data: {
          status: input.status,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.document.delete({
        where: {
          id: input.id,
          senderId: ctx.session.user.id,
        },
      });
    }),
});