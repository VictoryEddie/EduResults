import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    // Test 1: Check if Admin SDK can connect
    const listUsersResult = await adminAuth.listUsers(1);
    console.log("Connection Test: Admin SDK can list users");
    
    // Test 2: Try a simple Firestore operation
    const testDocRef = adminDb.collection("test").doc("connection");
    await testDocRef.set({ test: new Date().toISOString() });
    console.log("Connection Test: Firestore write succeeded");
    
    // Test 3: Try to read it back
    const docSnap = await testDocRef.get();
    console.log("Connection Test: Firestore read succeeded");
    
    // Clean up
    await testDocRef.delete();
    console.log("Connection Test: Cleanup succeeded");
    
    return NextResponse.json({
      success: true,
      message: "Firebase connection test passed",
      adminSdk: {
        canListUsers: true,
        userCount: listUsersResult.users.length
      },
      firestore: {
        canWrite: true,
        canRead: true,
        canDelete: true
      }
    });
  } catch (error: any) {
    console.error("Connection Test Error:", error);
    
    return NextResponse.json({
      success: false,
      message: "Firebase connection test failed",
      error: error.message,
      errorCode: error.code,
      suggestion: "Check Firebase project configuration, ensure Firestore is enabled, and verify service account permissions."
    }, { status: 500 });
  }
}