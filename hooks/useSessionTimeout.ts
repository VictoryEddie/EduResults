"use client";
import { useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 hours

export function useSessionTimeout(enabled = true) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await signOut(auth);
      await fetch("/api/session", { method: "DELETE" });
      window.location.href = "/";
    }, TIMEOUT_MS);
  };

  useEffect(() => {
    if (!enabled) return;
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [enabled]);
}
