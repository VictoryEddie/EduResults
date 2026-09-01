"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export function useDemoLock() {
  const { user } = useAuth();
  const [lockedActionTitle, setLockedActionTitle] = useState<string | null>(null);
  const [isAdminDemo, setIsAdminDemo] = useState<boolean>(false);

  useEffect(() => {
    // For admin portal (which uses server-side cookies rather than Firebase AuthContext)
    if (!user) {
      fetch("/api/admin/me", { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.isDemo) {
            setIsAdminDemo(true);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Check if current logged-in user is a demo account (Teacher, Parent, or Admin)
  const isDemoUser = Boolean(
    isAdminDemo ||
    user?.email?.endsWith("@demo.com") ||
    user?.email?.endsWith("@eduresults.com") ||
    user?.email?.startsWith("demo.")
  );

  /**
   * Guard function: Wrap around any handler.
   * If demo user, opens lock modal with action title and returns true.
   * If normal user, returns false.
   */
  const guardDemoAction = (actionTitle: string): boolean => {
    if (isDemoUser) {
      setLockedActionTitle(actionTitle);
      return true; // Action is blocked
    }
    return false; // Action is allowed
  };

  const closeDemoLock = () => setLockedActionTitle(null);

  return {
    isDemoUser,
    lockedActionTitle,
    guardDemoAction,
    closeDemoLock,
  };
}
