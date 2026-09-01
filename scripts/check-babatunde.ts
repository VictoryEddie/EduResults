import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

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

async function checkBabatunde() {
  const email = "babatunde.adebayo@demo.com";
  const user = await auth.getUserByEmail(email);
  console.log("Auth UID:", user.uid);

  const parentDoc = await db.collection("parents").doc(user.uid).get();
  console.log("Parent Doc Exists?:", parentDoc.exists);
  if (parentDoc.exists) console.log("Parent Doc Data:", parentDoc.data());

  // Check student Adebayo Oladipo doc
  const studentsSnap = await db.collectionGroup("students").where("parentEmail", "==", email).get();
  console.log("\nMatching Students Count:", studentsSnap.size);
  for (const s of studentsSnap.docs) {
    console.log("Student ID:", s.id, "Data:", s.data(), "Parent Ref Path:", s.ref.path);

    // Check term results
    const rSnap = await db.collection("results").doc(s.id).collection("terms").doc("2024-2025-First Term").get();
    console.log("Result 2024-2025-First Term Exists?:", rSnap.exists);
    if (rSnap.exists) {
      console.log("Result Data:", rSnap.data());
    }
  }
}

checkBabatunde().catch(console.error);
