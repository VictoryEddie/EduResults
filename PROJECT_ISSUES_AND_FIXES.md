# Project Issues & Fixes Log

## Issue 1: Client-side Permission Denied Errors During Login

**Symptoms:** When attempting to log in, the app showed "Missing or insufficient permissions" repeatedly, even with valid credentials and a properly created Firestore profile.
**Root cause:** Firebase client-side auth has a propagation delay. After `signInWithEmailAndPassword`, it can take some time before Firestore security rules recognize the authenticated user.

**Fix applied:** Moved teacher/parent profile validation to server-side API endpoints (`/api/session` and created `/api/auth/me`) which use Firebase Admin SDK (bypasses client-side security rules and delays).

---

## Issue 2: Fetch Not Sending Session Cookies

**Symptoms:** After logging in successfully (session cookie created), the dashboard still showed "session not verified" because AuthContext couldn't fetch the user profile.
**Root cause:** The client-side `fetch` call to `/api/auth/me` didn't include the `credentials: "include"` flag, so the browser didn't send the session cookie.

**Fix applied:** Added `credentials: "include"` to the `fetch` call in `AuthContext.tsx`

---

## Issue 3: Deprecated Firestore Persistence API

**Symptoms:** Browser console showed deprecation warnings about `enableIndexedDbPersistence` being deprecated.
**Root cause:** Project was using outdated Firestore persistence setup.

**Fix applied:** Updated `lib/firebase.ts` to use modern `initializeFirestore` with `localCache.persistent` and `tabManager.multiple` for multi-tab support.

---

## Issue 4: AuthContext Client-side Profile Fetching

**Symptoms:** Even with server-side login working, AuthContext still tried to fetch profiles from Firestore client-side (causing permission errors and delays).
**Root cause:** AuthContext was still relying on client-side Firestore for profile verification instead of using the server API.

**Fix applied:** Rewrote `AuthContext.tsx` to fetch user profiles exclusively from the server-side `/api/auth/me` endpoint (with retries for transient errors).

---

## Issue 5: Expired Firestore Security Rules (Critical Root Cause)

**Symptoms:** After fixing session issues, "Missing or insufficient permissions" persisted for all client-side Firestore operations.
**Root cause:** The Firestore security rules in the Firebase Console were set to "Test Mode" with an expiration date of `2026-05-09`. Since the current date was `2026-06-10`, all client-side requests were being rejected by the database itself, regardless of authentication status.

**Fix applied:** Replaced expired test rules with production-ready rules that allow users to read/write their own profiles and allow teachers to manage data while preventing unauthorized access.

---

## Files Modified

- `firestore.rules` - Updated rules (pasted into Firebase Console)
- `lib/firebase.ts` - Updated Firestore initialization
- `app/api/session/route.ts` - Improved session handling (already existed)
- `app/api/auth/me/route.ts` - Created new server-side profile endpoint
- `app/teacher/login/page.tsx` - Simplified login flow to skip client-side profile fetch
- `app/parent/login/page.tsx` - Simplified login flow
- `context/AuthContext.tsx` - Rewrote to use server API
