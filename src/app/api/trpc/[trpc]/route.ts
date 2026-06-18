import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest, NextResponse } from "next/server";
import { appRouter } from "@/server/root";
import { createTRPCContext } from "@/server/trpc";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import "@/lib/env"; // validate env vars at startup

function handler(req: NextRequest) {
  const ip = getClientIP(req);
  const { allowed } = checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError({ error }) {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error("[trpc] Internal server error:", error);
      }
    },
  });
}

export { handler as GET, handler as POST };
