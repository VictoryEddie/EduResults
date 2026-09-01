import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { verifyAdminSession } from "@/lib/verifyAdminSession";

async function isAdmin(req: NextRequest) {
  return !!(await verifyAdminSession(req));
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req)))
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  try {
    const parentsSnap = await adminDb.collection("parents").get();

    /* Fetch all teachers once, then query each teacher's students in parallel
       instead of fetching teachers inside a loop for every parent */
    const teachersSnap = await adminDb.collection("teachers").get();

    const parents = await Promise.all(
      parentsSnap.docs.map(async (d) => {
        const email = d.data().email;
        const childCounts = await Promise.all(
          teachersSnap.docs.map((t) =>
            adminDb
              .collection("teachers")
              .doc(t.id)
              .collection("students")
              .where("parentEmail", "==", email)
              .count()
              .get()
              .then((r) => r.data().count)
          )
        );
        const childCount = childCounts.reduce((a, b) => a + b, 0);
        return { id: d.id, ...d.data(), childCount };
      })
    );
    return NextResponse.json({ parents });
  } catch {
    return NextResponse.json(
      { error: "Failed to load parents." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await verifyAdminSession(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  if (session.isDemo) {
    return NextResponse.json(
      { error: "Demo accounts cannot create parent records." },
      { status: 403 }
    );
  }

  try {
    const { firstName, lastName, email, password } = await req.json();

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      password.length < 8
    ) {
      return NextResponse.json(
        { error: "All fields required, password at least 8 chars." },
        { status: 400 }
      );
    }

    // Check if email already exists in Firestore
    const emailCheck = await adminDb
      .collection("parents")
      .where("email", "==", email.toLowerCase())
      .limit(1)
      .get();
    if (!emailCheck.empty) {
      return NextResponse.json(
        { error: "Email already registered." },
        { status: 409 }
      );
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email: email.toLowerCase(),
      password: password,
      displayName: `${firstName} ${lastName}`,
    });

    // Create parent profile in Firestore
    await adminDb.collection("parents").doc(userRecord.uid).set({
      name: `${firstName} ${lastName}`,
      email: email.toLowerCase(),
      createdAt: new Date().toISOString(),
    });

    // Audit log
    await adminDb.collection("auditLog").add({
      action: "parent_created",
      parentId: userRecord.uid,
      parentName: `${firstName} ${lastName}`,
      email: email.toLowerCase(),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Create parent error:", error);
    if (error.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "Email already exists in Firebase Auth." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create parent account." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await verifyAdminSession(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  if (session.isDemo) {
    return NextResponse.json(
      { error: "Demo accounts cannot delete parent records." },
      { status: 403 }
    );
  }

  try {
    const { parentId } = await req.json();
    if (!parentId)
      return NextResponse.json(
        { error: "Parent ID required." },
        { status: 400 }
      );

    const parentDoc = await adminDb.collection("parents").doc(parentId).get();
    if (!parentDoc.exists)
      return NextResponse.json(
        { error: "Parent not found." },
        { status: 404 }
      );
    const parentData = parentDoc.data()!;

    // Delete Firestore profile only — student records stay
    await adminDb.collection("parents").doc(parentId).delete();

    // Revoke Firebase Auth tokens
    try {
      await adminAuth.revokeRefreshTokens(parentId);
    } catch {}

    // Audit log
    await adminDb.collection("auditLog").add({
      action: "parent_removed",
      targetId: parentId,
      targetName: parentData.name,
      targetEmail: parentData.email,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to remove parent." },
      { status: 500 }
    );
  }
}
