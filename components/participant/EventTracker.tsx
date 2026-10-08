"use client";

import { useEffect } from "react";
import { flushEvents, initEvents, track } from "./events-client";
import { closeAllReading } from "./reading";

const FLUSH_INTERVAL_MS = 5000;

/** Mounted once in the /task layout: owns the event queue for this session. */
export function EventTracker({ sessionId }: { sessionId: string }) {
  useEffect(() => {
    initEvents(sessionId);
    const interval = window.setInterval(() => void flushEvents(), FLUSH_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        track("tab_hidden");
        void flushEvents(true);
      } else {
        track("tab_visible");
      }
    };
    const onPageHide = () => {
      // Tab or browser closed, or a refresh: record the open case/file as closed (PLAN-04 D-7).
      closeAllReading("leave");
      void flushEvents(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [sessionId]);
  return null;
}
