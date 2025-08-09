import { createTRPCRouter } from "~/lib/trpc";
import { documentsRouter } from "./routers/documents";
import { signaturesRouter } from "./routers/signatures";
import { usersRouter } from "./routers/users";
import { analyticsRouter } from "./routers/analytics";

export const appRouter = createTRPCRouter({
  documents: documentsRouter,
  signatures: signaturesRouter,
  users: usersRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;