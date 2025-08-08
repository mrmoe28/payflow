import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/lib/trpc";

export const signaturesRouter = createTRPCRouter({
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
      });
    }),

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
        throw new Error("Signature request not found");
      }

      return signature;
    }),

  sign: publicProcedure
    .input(
      z.object({
        signatureId: z.string(),
        signatureData: z.string(),
        ipAddress: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
    }),

  decline: publicProcedure
    .input(z.object({ signatureId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.signature.update({
        where: {
          id: input.signatureId,
        },
        data: {
          status: "DECLINED",
        },
      });
    }),

  resend: protectedProcedure
    .input(z.object({ signatureId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const signature = await ctx.db.signature.findFirst({
        where: {
          id: input.signatureId,
        },
        include: {
          document: true,
        },
      });

      if (!signature) {
        throw new Error("Signature not found");
      }

      if (signature.document.senderId !== ctx.session.user.id) {
        throw new Error("Unauthorized");
      }

      // Here you would implement email sending logic
      // For now, we'll just update the timestamp
      return ctx.db.signature.update({
        where: {
          id: input.signatureId,
        },
        data: {
          updatedAt: new Date(),
        },
      });
    }),
});