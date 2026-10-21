"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/client/api";
import { crash } from "@/lib/observability/crash";
import { Observability } from "./Observability";

/** What the app reports as a non-fatal: the backend failing (5xx) or the page's own code throwing, not a refused 4xx or a dropped connection. */
function report(error: unknown, where: string) {
  if (error instanceof ApiError && error.status < 500) return;
  if (error instanceof DOMException && error.name === "AbortError") return;
  crash.log(`${where} failed`);
  crash.recordNonFatal(error);
}

/** Client-side state: server data cache, toasts and error reporting. 4xx answers are never retried. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: (error, query) => report(error, `load ${String(query.queryKey[0])}`) }),
        mutationCache: new MutationCache({ onError: (error, _v, _c, mutation) => report(error, `save ${String(mutation.options.mutationKey?.[0] ?? "action")}`) }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <Observability />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
