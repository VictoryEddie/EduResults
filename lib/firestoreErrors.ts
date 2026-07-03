const firestoreErrorMap: Record<string, string> = {
  "permission-denied": "You don't have permission to perform this action.",
  "not-found": "The requested data could not be found.",
  "unavailable": "Service is temporarily unavailable. Please try again shortly.",
  "deadline-exceeded": "The request took too long. Please try again.",
  "resource-exhausted": "Service limit reached. Please try again later.",
  "already-exists": "This record already exists.",
  "cancelled": "The operation was cancelled. Please try again.",
  "unauthenticated": "You must be signed in to perform this action.",
};

export function getFirestoreError(code: string): string {
  return firestoreErrorMap[code] ?? "Something went wrong. Please try again.";
}
