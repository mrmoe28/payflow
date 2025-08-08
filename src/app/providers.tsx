"use client";

import { SessionProvider } from "next-auth/react";
import { api } from "~/utils/api";

interface ProvidersProps {
  children: React.ReactNode;
}

function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}

export default api.withTRPC(Providers);