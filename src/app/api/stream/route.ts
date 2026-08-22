import { buildFleetState } from "@/services/state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PUSH_INTERVAL_MS = 2000;

/**
 * Server-sent events feed for the live console.
 *
 * SSE rather than websockets: the data only ever travels server to client, and
 * SSE reconnects on its own, so a dropped connection during a long heal recovers
 * without any client-side retry code.
 */
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const push = () => {
        try {
          const payload = JSON.stringify(buildFleetState());
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          // A failed serialization must not tear down the stream; the next tick retries.
        }
      };

      push();
      timer = setInterval(push, PUSH_INTERVAL_MS);

      request.signal.addEventListener("abort", () => {
        if (timer) clearInterval(timer);
        controller.close();
      });
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
