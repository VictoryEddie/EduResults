/**
 * demo-fix.ts
 * Run with: npx tsx scripts/demo-fix.ts
 *
 * Fixes all demo parent profiles, links children, fixes typos, and publishes all term results.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// ── Load .env.local ──────────────────────────────────────────────────────────
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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

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
const auth = getAuth();

const DEMO_PARENTS = [
  { name: "Babatunde Adebayo", email: "babatunde.adebayo@demo.com", password: "demo1234" },
  { name: "Oluwaseun Balogun", email: "oluwaseun.balogun@demo.com", password: "demo1234" },
  { name: "Mubarak Omoregie",  email: "mubarak.omoregie@demo.com",  password: "demo1234" },
];

async function main() {
  console.log("🚀 Starting Demo Data Fix & Synchronization...\n");

  // 1. Ensure Auth users exist & create profile docs in /parents/{uid}
  for (const p of DEMO_PARENTS) {
    let uid = "";
    try {
      const userRecord = await auth.getUserByEmail(p.email);
      uid = userRecord.uid;
      console.log(`[Auth] Found existing Auth user for ${p.name} (${uid})`);
    } catch (e: any) {
      if (e.code === "auth/user-not-found") {
        const newUser = await auth.createUser({
          email: p.email,
          password: p.password,
          displayName: p.name,
        });
        uid = newUser.uid;
        console.log(`[Auth] Created Auth user for ${p.name} (${uid})`);
      } else {
        throw e;
      }
    }

    // Write profile document to /parents/{uid}
    await db.collection("parents").doc(uid).set(
      {
        name: p.name,
        email: p.email.toLowerCase(),
        role: "parent",
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log(`[Firestore] Profile saved at parents/${uid} (${p.email})`);
  }

  // 2. Fix email typos in student documents across all teacher classes
  console.log("\n[Firestore] Scanning students to fix email typos and unlinked records...");
  const studentsSnap = await db.collectionGroup("students").get();
  
  for (const sDoc of studentsSnap.docs) {
    const data = sDoc.data();
    const currentEmail = (data.parentEmail || "").toLowerCase().trim();

    // Fix typo: babatunde.chukwudum@demo.com -> babatunde.adebayo@demo.com
    if (currentEmail.includes("chukwudum") || currentEmail.includes("chukudum")) {
      await sDoc.ref.update({ parentEmail: "babatunde.adebayo@demo.com" });
      console.log(`  ✓ Fixed typo on student ${data.name || sDoc.id}: babatunde.adebayo@demo.com`);
    }
  }

  // 3. Reassign 1 student to Mubarak Omoregie so he has 4 children total
  console.log("\n[Firestore] Reassigning 1 student to Mubarak Omoregie (mubarak.omoregie@demo.com)...");
  let mubarakCount = 0;
  let candidateForMubarak: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  for (const sDoc of studentsSnap.docs) {
    const pe = (sDoc.data().parentEmail || "").toLowerCase().trim();
    if (pe === "mubarak.omoregie@demo.com") {
      mubarakCount++;
    } else if (!candidateForMubarak && pe !== "babatunde.adebayo@demo.com" && pe !== "oluwaseun.balogun@demo.com") {
      candidateForMubarak = sDoc;
    }
  }

  if (mubarakCount < 4 && candidateForMubarak) {
    await candidateForMubarak.ref.update({ parentEmail: "mubarak.omoregie@demo.com" });
    const sName = candidateForMubarak.data().name || candidateForMubarak.id;
    console.log(`  ✓ Assigned student "${sName}" to Mubarak Omoregie! Mubarak now has 4 children.`);
  } else {
    console.log(`  Mubarak already has ${mubarakCount} children.`);
  }

  // 4. Ensure all term results for all demo children are set to published: true and have parentEmail
  console.log("\n[Firestore] Publishing all term results and attaching parent emails...");
  const demoParentEmails = new Set(DEMO_PARENTS.map((p) => p.email.toLowerCase()));

  // Re-fetch all students to get updated parentEmails
  const updatedStudentsSnap = await db.collectionGroup("students").get();
  let updatedResultsCount = 0;

  for (const sDoc of updatedStudentsSnap.docs) {
    const parentEmail = (sDoc.data().parentEmail || "").toLowerCase().trim();
    if (demoParentEmails.has(parentEmail)) {
      const termsSnap = await db.collection("results").doc(sDoc.id).collection("terms").get();
      for (const tDoc of termsSnap.docs) {
        await tDoc.ref.update({
          published: true,
          parentEmail: parentEmail,
        });
        updatedResultsCount++;
      }
    }
  }

  console.log(`  ✓ Updated and published ${updatedResultsCount} term result records across demo children!`);
  console.log("\n✅ Demo Fix Complete!\n");
}

main().catch((err) => {
  console.error("❌ Error running demo fix:", err);
  process.exit(1);
});
