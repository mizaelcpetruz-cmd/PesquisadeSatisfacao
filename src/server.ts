import "./core/errors/error-capture";

import { consumeLastCapturedError } from "./core/errors/error-capture";
import { renderErrorPage } from "./core/errors/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

// Start a background loop to trigger the cron locally in development
if (process.env.NODE_ENV === "development") {
  console.log("[Scheduler] Initializing local development background runner...");
  setInterval(async () => {
    try {
      const port = process.env.PORT || 8080;
      const url = `http://localhost:${port}/api/public/cron/run`;
      const key = process.env.SUPABASE_PUBLISHABLE_KEY;
      if (!key) return; // not initialized yet

      const res = await fetch(url, {
        method: "POST",
        headers: {
          apikey: key,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.summary && body.summary.length > 0) {
          console.log("[Scheduler] Dev background run completed:", body.summary);
        }
      }
    } catch (e) {
      // ignore network errors if server is not fully up yet
    }
  }, 60 * 1000); // Check every minute
}
