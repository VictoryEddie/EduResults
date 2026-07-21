import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { checkRateLimit, rateLimitResponse, getIP } from "@/lib/rateLimit";
import { verifySession } from "@/lib/verifySession";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const ip = getIP(req);
    if (!await checkRateLimit(`get-children:${ip}`, 30, 60 * 60 * 1000)) {
      const { error, status } = rateLimitResponse();
      return NextResponse.json({ error }, { status });
    }

    /* Get email from the verified session token — never trust the client for this.
       We look up the parent's email from their Firestore profile using their uid. */
    const parentDoc = await adminDb.collection("parents").doc(session.uid).get();
    if (!parentDoc.exists) return NextResponse.json({ error: "Parent profile not found." }, { status: 404 });
    const email = parentDoc.data()!.email;

    const children: { id: string; name: string; className: string; teacherName: string }[] = [];
    const studentsSnap = await adminDb.collectionGroup("students")
      .where("parentEmail", "==", email.toLowerCase())
      .get();
    
    const teacherCache = new Map<string, FirebaseFirestore.DocumentData>();

    for (const studentDoc of studentsSnap.docs) {
      const studentData = studentDoc.data();
      const teacherRef = studentDoc.ref.parent.parent;
      if (!teacherRef) continue;

      let teacherData = teacherCache.get(teacherRef.id);
      if (!teacherData) {
        const tSnap = await teacherRef.get();
        if (tSnap.exists) {
          teacherData = tSnap.data()!;
          teacherCache.set(teacherRef.id, teacherData);
        }
      }

      const studentName = studentData.name 
        ? studentData.name 
        : `${studentData.firstName || ""} ${studentData.lastName || ""}`.trim() 
        || "Unknown Student";
      
      children.push({
        id: studentDoc.id,
        name: studentName,
        className: teacherData?.className || "",
        teacherName: teacherData?.name || "",
      });
    }

    return NextResponse.json({ children });
  } catch {
    return NextResponse.json({ error: "Failed to fetch children. Please try again." }, { status: 500 });
  }
}
