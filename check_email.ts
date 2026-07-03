import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";

// Load environment variables manually
const envFile = fs.readFileSync(".env.local", "utf8");
for (const line of envFile.split("\n")) {
  if (line.trim() && !line.startsWith("#")) {
    const [key, ...value] = line.split("=");
    process.env[key.trim()] = value.join("=").trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
}

// Manually initialize admin app to be sure
const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();
const auth = getAuth();

async function checkEmail(email: string) {
  console.log(`Checking database for email: ${email}`);
  
  try {
    // 1. Check Firebase Auth
    try {
      const userRecord = await auth.getUserByEmail(email);
      console.log(`\n--- FIREBASE AUTH ---`);
      console.log(`Found user in Auth: UID = ${userRecord.uid}`);
      console.log(`Creation Time: ${userRecord.metadata.creationTime}`);
      console.log(`Last Sign In: ${userRecord.metadata.lastSignInTime}`);
    } catch (e: any) {
      console.log(`\n--- FIREBASE AUTH ---`);
      console.log(`User not found in Firebase Auth (${e.code}).`);
    }

    // 2. Check Teachers collection
    console.log(`\n--- TEACHERS COLLECTION ---`);
    const teachersSnap = await db.collection("teachers").where("email", "==", email).get();
    if (teachersSnap.empty) {
      console.log(`No active teacher found with this email.`);
    } else {
      for (const doc of teachersSnap.docs) {
        console.log(`Found active Teacher! UID (Doc ID): ${doc.id}`);
        console.log(`Data:`, doc.data());
        
        // Count students
        const studentsSnap = await doc.ref.collection("students").get();
        console.log(`This teacher has ${studentsSnap.size} students.`);
      }
    }

    // 3. Check Orphaned Teachers collection
    console.log(`\n--- ORPHANED TEACHERS COLLECTION ---`);
    const orphanedSnap = await db.collection("orphanedTeachers").where("email", "==", email).get();
    if (orphanedSnap.empty) {
      console.log(`No orphaned teacher found with this email.`);
    } else {
      for (const doc of orphanedSnap.docs) {
        console.log(`Found Orphaned Teacher! UID: ${doc.id}`);
        console.log(`Data:`, doc.data());
      }
    }

    // 4. Check Admins collection
    console.log(`\n--- ADMINS COLLECTION ---`);
    const adminsSnap = await db.collection("admins").where("email", "==", email).get();
    if (adminsSnap.empty) {
      console.log(`No admin found with this email.`);
    } else {
      for (const doc of adminsSnap.docs) {
        console.log(`Found Admin! UID: ${doc.id}`);
        console.log(`Data:`, doc.data());
      }
    }

  } catch (err) {
    console.error("Error during check:", err);
  }
}

checkEmail("viceddie124@gmail.com");
