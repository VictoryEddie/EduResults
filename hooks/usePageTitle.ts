"use client";
import { useEffect } from "react";

/* Sets the browser tab title for client components.
   The layout template handles the base "EduResults" suffix. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | EduResults`;
  }, [title]);
}
