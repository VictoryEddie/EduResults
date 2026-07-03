import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifySession } from "@/lib/verifySession";
import { sendMail } from "@/lib/mailer";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const session = await verifySession(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(`publish-results:${session.uid}`, 10, 60 * 60 * 1000)) {
    const { error, status } = rateLimitResponse();
    return NextResponse.json({ error }, { status });
  }

  // Check if mailer is configured
  const isMailerConfigured = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD;

  try {
    const { studentIds, term, year } = await req.json();
    /* teacherId comes from the verified session — never trust the client for this */
    const teacherId = session.uid;

    if (!studentIds?.length || !term || !year) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }

    const termKey = `${year}-${term}`;
    const teacherRef = adminDb.collection("teachers").doc(teacherId);
    const teacherDoc = await teacherRef.get();
    const teacherName = teacherDoc.exists
      ? teacherDoc.data()!.name
      : "Your teacher";
    const className = teacherDoc.exists ? teacherDoc.data()!.className : "";

    // Fetch school settings for email branding
    const settingsDoc = await adminDb
      .collection("adminConfig")
      .doc("schoolSettings")
      .get();
    const schoolName = settingsDoc.exists
      ? settingsDoc.data()!.schoolName
      : "EduResults";

    // 1. Fetch all students for this teacher to verify ownership and get parent emails
    const studentsSnap = await teacherRef.collection("students").get();
    const studentMap = new Map(
      studentsSnap.docs.map((doc) => [doc.id, doc.data()]),
    );

    // 2. Filter studentIds to only those that belong to this teacher
    const validStudentIds = studentIds.filter((id: string) =>
      studentMap.has(id),
    );
    if (validStudentIds.length === 0) {
      return NextResponse.json(
        { error: "No valid students found." },
        { status: 400 },
      );
    }

    // 3. Fetch all result documents in one go to check which ones exist
    const resultRefs = validStudentIds.map((id: string) =>
      adminDb.collection("results").doc(id).collection("terms").doc(termKey),
    );
    const resultDocs = await adminDb.getAll(...resultRefs);

    const parentNotifications: Record<string, { studentNames: string[] }> = {};
    let publishedCount = 0;
    const batch = adminDb.batch();

    // 4. Prepare updates for existing results
    // First, pre-calculate totals for all students to handle rankings
    const studentScoresMap = new Map();
    resultDocs.forEach((doc, index) => {
      if (doc.exists) {
        const data = doc.data()!;
        const total = (data.scores || []).reduce((sum: number, r: any) => sum + r.total, 0);
        studentScoresMap.set(validStudentIds[index], total);
      }
    });

    const allTotals = Array.from(studentScoresMap.values()).sort((a, b) => b - a);

    resultDocs.forEach((doc, index) => {
      if (doc.exists) {
        const studentId = validStudentIds[index];
        const studentData = studentMap.get(studentId)!;
        const studentTotal = studentScoresMap.get(studentId);
        
        // Calculate rank
        const rank = allTotals.indexOf(studentTotal) + 1;

        batch.update(doc.ref, { 
          published: true, 
          publishedAt: new Date().toISOString(), 
          termEndDate: new Date().toISOString(),
          position: rank, // Store pre-calculated rank
          totalStudents: validStudentIds.length, // Store total students in class for context
          parentEmail: studentData.parentEmail // Store for easier parent access
        });
        
        publishedCount++;

        const parentEmail = studentData.parentEmail;
        const studentName = studentData.name;

        if (parentEmail) {
          if (!parentNotifications[parentEmail]) {
            parentNotifications[parentEmail] = { studentNames: [] };
          }
          parentNotifications[parentEmail].studentNames.push(studentName);
        }
      }
    });

    if (publishedCount === 0) {
      return NextResponse.json(
        { error: "No results found to publish." },
        { status: 404 },
      );
    }

    // 5. Update teacher cache in the same batch
    batch.update(teacherRef, {
      cachedResultsUploaded: publishedCount,
      cachedTotalStudents: studentsSnap.size,
      cacheUpdatedAt: new Date().toISOString(),
    });

    // 6. Commit all changes atomically
    await batch.commit();

    // Send group emails (if mailer is configured)
    const notifiedEmails: string[] = [];
    const failedEmails: string[] = [];

    if (isMailerConfigured) {
      const emailPromises = Object.keys(parentNotifications).map(async (email) => {
        try {
          const { studentNames } = parentNotifications[email];
          const isMultiple = studentNames.length > 1;
          const namesList =
            studentNames.length === 2
              ? `${studentNames[0]} and ${studentNames[1]}`
              : studentNames.join(", ");

          await sendMail({
            to: email,
            fromName: schoolName,
            subject: isMultiple
              ? `Academic Results for ${namesList} are Ready`
              : `${studentNames[0]}'s ${term} ${year} Results Are Ready`,
            html: `
              <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 24px;">
                <div style="background: white; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                  <h2 style="color: #1e293b; margin-top: 0;">Academic Results Available</h2>
                  <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear Parent/Guardian,</p>
                  <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                    The <strong>${term} ${year}</strong> results for ${isMultiple ? "your children" : ""} 
                    <strong style="color: #2563eb;">${namesList}</strong>
                    (${className}) have been published by ${teacherName}.
                  </p>
                  <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                    Please log in to the <strong>${schoolName}</strong> portal to view the full performance report and subject breakdown.
                  </p>
                  <div style="text-align: center; margin-top: 32px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/parent/login"
                      style="display: inline-block; background: #1e293b; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px;">
                      View Results Portal
                    </a>
                  </div>
                  <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
                  <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-bottom: 0;">
                    This is an automated notification from the ${schoolName} Academic Portal.
                  </p>
                </div>
              </div>
            `,
          });
          notifiedEmails.push(email);
        } catch (err) {
          console.error(`Failed to notify ${email}:`, err);
          failedEmails.push(email);
        }
      });

      await Promise.all(emailPromises);
    } else {
      console.warn("Mailer not configured - skipping email notifications");
    }

    /* Audit log */
    await adminDb.collection("auditLog").add({
      action: "results_published",
      teacherId,
      teacherNamePublished: teacherName,
      classNamePublished: className,
      studentCount: publishedCount,
      term,
      year,
      notifiedEmails,
      failedEmails,
      ip,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      published: publishedCount,
      notified: notifiedEmails.length,
      failed: failedEmails.length,
      failedEmails,
      mailerConfigured: isMailerConfigured,
    });
  } catch (err) {
    console.error("Publish error:", err);
    return NextResponse.json(
      { error: "Failed to publish results." },
      { status: 500 },
    );
  }
}
