/**
 * demo-audit.ts
 * Run with: npx tsx scripts/demo-audit.ts
 *
 * Audits Firestore and prints:
 *  - Each demo teacher → student count + student names
 *  - Each demo parent  → children, and for each child: results (term, year, published)
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ── Load .env.local manually (no dotenv needed) ──────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

// ── Init Firebase Admin ──────────────────────────────────────────────────────
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}
const db = getFirestore();

// ── Demo account lists ───────────────────────────────────────────────────────
const DEMO_TEACHERS = [
  { name: "Adewale Okafor",  email: "adewale.okafor@eduresults.com",  className: "JSS 1A"      },
  { name: "Fatima Abdullahi", email: "fatima.abdullahi@eduresults.com", className: "SSS 2B"      },
  { name: "Chidera Nwankwo",  email: "chidera.nwankwo@eduresults.com",  className: "Primary 5C"  },
];

const DEMO_PARENTS = [
  { name: "Babatunde Adebayo", email: "babatunde.adebayo@demo.com" },
  { name: "Oluwaseun Balogun", email: "oluwaseun.balogun@demo.com" },
  { name: "Mubarak Omoregie",  email: "mubarak.omoregie@demo.com"  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function divider(char = "─", len = 60) {
  console.log(char.repeat(len));
}

function header(title: string) {
  divider("═");
  console.log(`  ${title}`);
  divider("═");
}

function section(title: string) {
  console.log();
  divider();
  console.log(`  ${title}`);
  divider();
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log();
  header("EduResults Demo Data Audit");
  console.log(`  Run at: ${new Date().toLocaleString("en-GB")}`);

  // ────────────────────────────────────────────────────────────────────────────
  // 1. TEACHERS
  // ────────────────────────────────────────────────────────────────────────────
  header("👨‍🏫  TEACHERS → STUDENTS");

  // Find teacher docs by email
  const teachersSnap = await db.collection("teachers").get();
  const teacherMap = new Map<string, FirebaseFirestore.DocumentData & { docId: string }>();
  for (const doc of teachersSnap.docs) {
    const data = doc.data();
    teacherMap.set(data.email?.toLowerCase(), { ...data, docId: doc.id });
  }

  let totalStudents = 0;

  for (const demo of DEMO_TEACHERS) {
    const teacherDoc = teacherMap.get(demo.email.toLowerCase());
    section(`${demo.name}  (${demo.className})`);
    console.log(`  Email : ${demo.email}`);

    if (!teacherDoc) {
      console.log("  ⚠️  Teacher doc NOT FOUND in Firestore");
      continue;
    }

    console.log(`  UID   : ${teacherDoc.docId}`);

    const studentsSnap = await db
      .collection("teachers")
      .doc(teacherDoc.docId)
      .collection("students")
      .get();

    const students = studentsSnap.docs;
    console.log(`  Students (${students.length}):`);

    if (students.length === 0) {
      console.log("    — none —");
    } else {
      for (const s of students) {
        const d = s.data();
        const name =
          d.name ||
          `${d.firstName || ""} ${d.lastName || ""}`.trim() ||
          "Unknown";
        const parentEmail = d.parentEmail || "(no parent linked)";
        console.log(`    • ${name}  [parentEmail: ${parentEmail}]`);
        totalStudents++;
      }
    }
  }

  console.log();
  console.log(`  Total students across all demo teachers: ${totalStudents}`);

  // ────────────────────────────────────────────────────────────────────────────
  // 2. PARENTS → CHILDREN → RESULTS
  // ────────────────────────────────────────────────────────────────────────────
  header("👪  PARENTS → CHILDREN → RESULTS");

  for (const demo of DEMO_PARENTS) {
    section(`${demo.name}`);
    console.log(`  Email : ${demo.email}`);

    // Find all students linked to this parent
    const childrenSnap = await db
      .collectionGroup("students")
      .where("parentEmail", "==", demo.email.toLowerCase())
      .get();

    const children = childrenSnap.docs;
    console.log(`  Children: ${children.length}`);

    if (children.length === 0) {
      console.log("    — no children linked —");
      continue;
    }

    for (const child of children) {
      const d = child.data();
      const name =
        d.name ||
        `${d.firstName || ""} ${d.lastName || ""}`.trim() ||
        "Unknown";

      // Get the teacher's className from the parent doc reference
      const teacherRef = child.ref.parent.parent;
      let className = "(unknown class)";
      let teacherName = "(unknown teacher)";
      if (teacherRef) {
        const tSnap = await teacherRef.get();
        if (tSnap.exists) {
          const td = tSnap.data()!;
          className = td.className || className;
          teacherName = td.name || teacherName;
        }
      }

      console.log(`\n    ┌─ ${name}`);
      console.log(`    │  Class  : ${className}`);
      console.log(`    │  Teacher: ${teacherName}`);
      console.log(`    │  Student ID: ${child.id}`);

      // Fetch results for this student
      const termsSnap = await db
        .collection("results")
        .doc(child.id)
        .collection("terms")
        .get();

      if (termsSnap.empty) {
        console.log("    │  Results: ❌ No results yet");
      } else {
        console.log(`    │  Results: ✅ ${termsSnap.docs.length} term(s)`);
        for (const termDoc of termsSnap.docs) {
          const rd = termDoc.data();
          const published = rd.published === true ? "✅ Published" : "📝 Draft (not published)";
          const subjects = Array.isArray(rd.scores) ? rd.scores.length : 0;
          console.log(
            `    │    → [${termDoc.id}]  ${rd.term ?? "?"}  |  Year: ${rd.year ?? "?"}  |  ${published}  |  ${subjects} subject(s)`
          );
        }
      }
      console.log("    └─────────────────────────────────");
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 3. SUMMARY
  // ────────────────────────────────────────────────────────────────────────────
  header("📊  SUMMARY");

  // Count all results docs for demo students
  let totalResults = 0;
  let publishedResults = 0;
  let draftResults = 0;

  const allStudentsSnap = await db.collectionGroup("students").get();
  const demoPEemails = new Set(DEMO_PARENTS.map((p) => p.email.toLowerCase()));
  const demoStudentIds: string[] = [];

  for (const s of allStudentsSnap.docs) {
    const parentEmail = s.data().parentEmail?.toLowerCase();
    if (demoPEemails.has(parentEmail)) {
      demoStudentIds.push(s.id);
    }
  }

  for (const id of demoStudentIds) {
    const tSnap = await db.collection("results").doc(id).collection("terms").get();
    for (const t of tSnap.docs) {
      totalResults++;
      if (t.data().published === true) publishedResults++;
      else draftResults++;
    }
  }

  console.log(`  Demo teachers     : ${DEMO_TEACHERS.length}`);
  console.log(`  Demo parents      : ${DEMO_PARENTS.length}`);
  console.log(`  Total students    : ${demoStudentIds.length}`);
  console.log(`  Result records    : ${totalResults}`);
  console.log(`    ✅ Published    : ${publishedResults}`);
  console.log(`    📝 Draft        : ${draftResults}`);

  divider("═");
  console.log();
}

main().catch((e) => {
  console.error("Audit failed:", e);
  process.exit(1);
});
