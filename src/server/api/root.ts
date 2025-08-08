import { createTRPCRouter } from "~/lib/trpc";
import { documentsRouter } from "./routers/documents";
import { signaturesRouter } from "./routers/signatures";

export const appRouter = createTRPCRouter({
  documents: documentsRouter,
  signatures: signaturesRouter,
});

export type AppRouter = typeof appRouter;