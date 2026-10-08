"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Shows whatever step the server says is current. /task is the only URL, so
 * this is a refresh; a leftover query (?resumed=1) is dropped on the way.
 */
export function useReloadStep() {
  const router = useRouter();
  return useCallback(() => {
    if (window.location.search) router.replace("/task");
    else router.refresh();
  }, [router]);
}
