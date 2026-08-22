"use client";

import { useEffect, useRef, useState } from "react";
import type { FleetState } from "@/services/state";

/**
 * Subscribe to the server-sent fleet feed.
 *
 * EventSource reconnects on its own after a network drop, which matters here
 * because a heal can run for fifteen minutes and the operator is watching the
 * console the whole time. A one-shot fetch primes the view so the first paint
 * is never empty while the stream negotiates.
 */
export function useFleetStream(): { state: FleetState | undefined; connected: boolean } {
  const [state, setState] = useState<FleetState>();
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef<EventSource>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/state")
      .then((response) => response.json())
      .then((initial: FleetState) => {
        if (!cancelled) setState(initial);
      })
      .catch(() => {
        // The stream is the source of truth; a failed prime is not fatal.
      });

    const source = new EventSource("/api/stream");
    sourceRef.current = source;

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      try {
        setState(JSON.parse(event.data) as FleetState);
        setConnected(true);
      } catch {
        // Ignore a malformed frame rather than dropping the subscription.
      }
    };

    return () => {
      cancelled = true;
      source.close();
    };
  }, []);

  return { state, connected };
}
