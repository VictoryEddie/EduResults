const authErrorMap: Record<string, string> = {
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/invalid-credential": "Incorrect email or password. Please try again.",
  "auth/user-not-found": "No account found with this email. Please check and try again.",
  "auth/email-already-in-use": "An account with this email already exists. Try signing in instead.",
  "auth/weak-password": "Password must be at least 8 characters.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/too-many-requests": "Too many failed attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Network error. Please check your internet connection and try again.",
  "auth/user-disabled": "This account has been disabled. Please contact support.",
  "auth/requires-recent-login": "Your session has expired. Please sign in again.",
  "auth/operation-not-allowed": "Email/password sign-in is not enabled. Please contact support.",
  "auth/expired-action-code": "This link has expired. Please request a new one.",
  "auth/invalid-action-code": "This link is invalid or has already been used. Please request a new one.",
  "auth/missing-email": "Please enter your email address.",
};

export function getAuthError(code: string): string {
  return authErrorMap[code] ?? `An unexpected error occurred (${code || "unknown"}). Please try again.`;
}
