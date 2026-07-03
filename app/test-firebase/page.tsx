"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function TestFirebase() {
  const [status, setStatus] = useState<string>("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [firestoreTest, setFirestoreTest] = useState<any>(null);
  const [authState, setAuthState] = useState<string>("Checking...");

  useEffect(() => {
    // Test 1: Check if Firebase Auth is initialized
    setStatus("Checking Firebase Auth initialization...");
    console.log("Firebase Auth object:", auth);
    console.log("Firebase App name:", auth.app.name);
    console.log("Firebase Config projectId:", auth.app.options.projectId);

    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthState(`Authenticated as: ${user.email || user.uid}`);
        console.log("User authenticated:", user.uid, user.email);
      } else {
        setAuthState("Not authenticated");
        console.log("User not authenticated");
      }
    });

    // Test 2: Try to connect to Firestore without authentication
    async function testFirestore() {
      try {
        setStatus("Testing Firestore connection...");

        // Create a test document reference
        const testDocRef = doc(db, "testConnection", "clientTest");

        // Try to write (this will fail if not authenticated, but we can check connectivity)
        console.log("Attempting Firestore operation...");

        // Check if we can at least initialize the connection
        const testData = {
          timestamp: new Date().toISOString(),
          test: "client-side connection test",
          attempt: "unauthenticated",
        };

        try {
          // Try to write (might fail due to permissions, but that's OK)
          await setDoc(testDocRef, testData);
          console.log("Firestore write succeeded (unauthenticated)");

          // Try to read back
          const docSnap = await getDoc(testDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Firestore read succeeded:", data);
            setFirestoreTest(data);
            setStatus("Firestore connection test passed!");
          }
        } catch (writeErr: any) {
          // If we get a permission error, that means we CAN connect to Firestore
          // but don't have permission to write (which is expected)
          if (writeErr.code === "permission-denied") {
            console.log(
              "Firestore connection successful (got permission-denied as expected)",
            );
            setStatus(
              "Firestore connection established! (Permission denied is expected)",
            );
            setError("Connection OK: Got expected permission-denied error");
          } else if (writeErr.code === "unavailable") {
            console.error("Firestore unavailable error:", writeErr);
            setStatus("Firestore connection failed: Server unavailable");
            setError(`Firestore unavailable: ${writeErr.message}`);
          } else {
            console.error("Firestore other error:", writeErr);
            setStatus(`Firestore error: ${writeErr.code}`);
            setError(`Firestore error: ${writeErr.message}`);
          }
        }
      } catch (err: any) {
        console.error("Firebase test failed:", err);
        setError(err.message);
        setStatus(`Test failed: ${err.code || "unknown error"}`);
      }
    }

    // Wait a bit for auth state to initialize, then test Firestore
    const timer = setTimeout(() => {
      testFirestore();
    }, 1000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-6">Firebase Connection Test</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Status</h2>
        <div
          className={`p-4 rounded ${status.includes("passed") ? "bg-green-100 text-green-800" : status.includes("failed") ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}
        >
          <strong>Status:</strong> {status}
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded">
          <strong>Auth State:</strong> {authState}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
            <strong className="text-red-700">Error:</strong>
            <pre className="mt-2 text-sm text-red-600 whitespace-pre-wrap">
              {error}
            </pre>
          </div>
        )}
      </div>

      {firestoreTest && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Firestore Test Results</h2>
          <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(firestoreTest, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Troubleshooting Steps</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Check browser console (F12) for detailed errors</li>
          <li>Disable ad blockers for localhost:3000</li>
          <li>Check internet connection</li>
          <li>Verify Firebase project configuration in .env.local</li>
          <li>Ensure Firestore is enabled in Firebase Console</li>
          <li>Check if Firestore rules allow basic read/write operations</li>
        </ul>
      </div>
    </div>
  );
}
