import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import bcrypt from "bcryptjs";

// Demo password for all demo accounts
const DEMO_PASSWORD = "demo1234";

// Demo data
const demoAdmin = {
  name: "Demo Admin",
  email: "demo.admin@eduresults.com",
};

const demoTeachers = [
  {
    firstName: "Adewale",
    lastName: "Okafor",
    email: "adewale.okafor@eduresults.com",
    className: "JSS 1A",
    subjects: [
      "Mathematics",
      "English Language",
      "Basic Science",
      "Social Studies",
      "Business Studies",
      "Home Economics",
    ],
  },
  {
    firstName: "Fatima",
    lastName: "Abdullahi",
    email: "fatima.abdullahi@eduresults.com",
    className: "SSS 2B",
    subjects: [
      "Mathematics",
      "English Language",
      "Physics",
      "Chemistry",
      "Biology",
      "Economics",
      "Government",
    ],
  },
  {
    firstName: "Chidera",
    lastName: "Nwankwo",
    email: "chidera.nwankwo@eduresults.com",
    className: "Primary 5C",
    subjects: [
      "Quantitative Reasoning",
      "Verbal Reasoning",
      "English Language",
      "Mathematics",
      "Basic Science",
      "Social Studies",
    ],
  },
];

// Nigerian student first and last names
const nigerianFirstNames = [
  "Aisha",
  "Chidi",
  "Fatima",
  "Ibrahim",
  "Kelechi",
  "Musa",
  "Ngozi",
  "Oluwaseun",
  "Sani",
  "Zainab",
  "Adebayo",
  "Bola",
  "Chika",
  "Damilola",
  "Ebere",
  "Femi",
  "Halima",
  "Ifeanyi",
  "Jumoke",
  "Kabir",
  "Lola",
  "Mubarak",
  "Nneka",
  "Opeyemi",
  "Rahman",
  "Tunde",
  "Uju",
  "Yusuf",
  "Zara",
  "Abubakar",
  "Blessing",
  "Chioma",
  "Daniel",
  "Esther",
  "Faith",
  "Godwin",
  "Hannah",
  "Isaac",
  "Joy",
  "Kingsley",
  "Mercy",
  "Nathaniel",
  "Ogochukwu",
  "Paul",
  "Queen",
  "Ruth",
  "Samuel",
  "Temitope",
  "Umar",
  "Victoria",
];

const nigerianLastNames = [
  "Adewale",
  "Okafor",
  "Abdullahi",
  "Nwankwo",
  "Balogun",
  "Eze",
  "Ibrahim",
  "Okoro",
  "Yusuf",
  "Chukwu",
  "Oladipo",
  "Uche",
  "Musa",
  "Okafor",
  "Agu",
  "Onyeka",
  "Nnamani",
  "Ojo",
  "Afolabi",
  "Omoregie",
  "Okonkwo",
  "Idris",
  "Okafor",
  "Emmanuel",
  "Ogunleye",
  "Adewumi",
  "Ogbonna",
  "Ibeh",
  "Oche",
  "Ameh",
  "Abdul",
  "Okafor",
  "Nwachukwu",
  "Ojo",
  "Adeniyi",
  "Okafor",
  "Okechukwu",
  "Ibrahim",
  "Okafor",
  "Okafor",
];

// Demo parents
const demoParents = [
  // 5 parents with 1 child each
  {
    firstName: "Babatunde",
    lastName: "Adebayo",
    email: "babatunde.adebayo@demo.com",
    childCount: 1,
  },
  {
    firstName: "Amara",
    lastName: "Okafor",
    email: "amara.okafor@demo.com",
    childCount: 1,
  },
  {
    firstName: "Ibrahim",
    lastName: "Yusuf",
    email: "ibrahim.yusuf@demo.com",
    childCount: 1,
  },
  {
    firstName: "Chinwe",
    lastName: "Nwankwo",
    email: "chinwe.nwankwo@demo.com",
    childCount: 1,
  },
  {
    firstName: "Hassan",
    lastName: "Abdul",
    email: "hassan.abdul@demo.com",
    childCount: 1,
  },
  // 3 parents with 2 children each
  {
    firstName: "Oluwaseun",
    lastName: "Balogun",
    email: "oluwaseun.balogun@demo.com",
    childCount: 2,
  },
  {
    firstName: "Zainab",
    lastName: "Ibrahim",
    email: "zainab.ibrahim@demo.com",
    childCount: 2,
  },
  {
    firstName: "Ifeanyi",
    lastName: "Okafor",
    email: "ifeanyi.okafor@demo.com",
    childCount: 2,
  },
  // 3 parents with 4-6 children each
  {
    firstName: "Mubarak",
    lastName: "Omoregie",
    email: "mubarak.omoregie@demo.com",
    childCount: 5,
  },
  {
    firstName: "Ngozi",
    lastName: "Eze",
    email: "ngozi.eze@demo.com",
    childCount: 4,
  },
  {
    firstName: "Tunde",
    lastName: "Okonkwo",
    email: "tunde.okonkwo@demo.com",
    childCount: 6,
  },
];

async function getRandomName(index: number) {
  const firstName = nigerianFirstNames[index % nigerianFirstNames.length];
  const lastName = nigerianLastNames[index % nigerianLastNames.length];
  return { firstName, lastName };
}

function getGrade(total: number) {
  if (total >= 80) return "A";
  if (total >= 70) return "B";
  if (total >= 60) return "C";
  if (total >= 50) return "D";
  if (total >= 40) return "E";
  return "F";
}

function getRandomScore(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function POST(req: NextRequest) {
  try {
    console.log("Setting up demo accounts...");

    // Academic years to generate: 2021-2022 through 2026-2027
    const academicYears = [
      "2021-2022",
      "2022-2023",
      "2023-2024",
      "2024-2025",
      "2025-2026",
      "2026-2027",
    ];
    const terms = ["First Term", "Second Term"];

    // 1. Create demo admin
    const existingAdminSnap = await adminDb
      .collection("admins")
      .where("email", "==", demoAdmin.email.toLowerCase())
      .limit(1)
      .get();

    if (existingAdminSnap.empty) {
      const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
      await adminDb.collection("admins").add({
        name: demoAdmin.name,
        email: demoAdmin.email.toLowerCase(),
        password: hashedPassword,
        createdAt: new Date().toISOString(),
      });
      console.log("Demo admin created successfully");
    } else {
      console.log("Demo admin already exists");
    }

    // 2. Create demo teachers and their students
    const createdTeacherUids: string[] = [];
    for (const teacher of demoTeachers) {
      try {
        // Check if teacher already exists by email
        let teacherUid: string;
        try {
          const existingTeacher = await adminAuth.getUserByEmail(
            teacher.email.toLowerCase(),
          );
          teacherUid = existingTeacher.uid;
          console.log(`Demo teacher ${teacher.email} already exists`);
        } catch {
          // Create new teacher
          const userRecord = await adminAuth.createUser({
            email: teacher.email.toLowerCase(),
            password: DEMO_PASSWORD,
            displayName: `${teacher.firstName} ${teacher.lastName}`,
            emailVerified: true,
          });
          teacherUid = userRecord.uid;

          // Create teacher profile
          await adminDb
            .collection("teachers")
            .doc(teacherUid)
            .set({
              name: `${teacher.firstName} ${teacher.lastName}`,
              email: teacher.email.toLowerCase(),
              className: teacher.className,
              createdAt: new Date().toISOString(),
            });

          console.log(`Demo teacher ${teacher.email} created`);
        }

        createdTeacherUids.push(teacherUid);

        // Create 11 students for this teacher (if they don't exist yet)
        const studentsRef = adminDb
          .collection("teachers")
          .doc(teacherUid)
          .collection("students");
        const existingStudents = await studentsRef.get();
        const studentDocs = existingStudents.docs;

        if (existingStudents.size < 11) {
          const numStudentsToCreate = 11 - existingStudents.size;
          for (let i = 0; i < numStudentsToCreate; i++) {
            const studentName = await getRandomName(i + existingStudents.size);
            const studentEmail = `${studentName.firstName.toLowerCase()}.${studentName.lastName.toLowerCase()}${i}@student.demo`;
            const admissionNumber = `STD${String(Date.now()).slice(-4)}${String(i + 100).slice(-2)}`;

            const newStudentDoc = await studentsRef.add({
              firstName: studentName.firstName,
              lastName: studentName.lastName,
              name: `${studentName.firstName} ${studentName.lastName}`,
              email: studentEmail,
              admissionNumber,
              gender: i % 2 === 0 ? "Male" : "Female",
              dateOfBirth: `201${(i % 5) + 0}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
              parentEmail: "",
              createdAt: new Date().toISOString(),
            });
            studentDocs.push(newStudentDoc);
          }
          console.log(
            `Created ${numStudentsToCreate} students for teacher ${teacher.email}`,
          );
        }

        // Now create subjects and results for ALL academic years and terms
        for (const academicYear of academicYears) {
          for (const term of terms) {
            const termKey = `${academicYear}-${term}`;

            // Create subjects for this term/year
            const subjectsRef = adminDb
              .collection("teachers")
              .doc(teacherUid)
              .collection("subjects")
              .doc(termKey);
            const subjectsSnap = await subjectsRef.get();
            if (!subjectsSnap.exists) {
              await subjectsRef.set({ list: teacher.subjects });
              console.log(
                `Created subjects for ${teacher.email} (${termKey}): ${teacher.subjects.join(", ")}`,
              );
            }

            // Create results for each student for this term/year
            for (const studentDoc of studentDocs) {
              const studentData = studentDoc.data();
              const studentId = studentDoc.id;

              const resultRef = adminDb
                .collection("results")
                .doc(studentId)
                .collection("terms")
                .doc(termKey);
              const resultSnap = await resultRef.get();

              if (!resultSnap.exists) {
                // Generate slightly varying scores based on student index, year, and term
                const studentIndex = studentDocs.indexOf(studentDoc);
                const yearIndex = academicYears.indexOf(academicYear);
                const termIndex = terms.indexOf(term);
                const baseOffset = (studentIndex + yearIndex + termIndex) * 2;

                const scores = teacher.subjects.map((subject) => {
                  const ca = getRandomScore(20 + baseOffset, 38 - baseOffset);
                  const exam = getRandomScore(40 + baseOffset, 58 - baseOffset);
                  const total = ca + exam;
                  return { subject, ca, exam, total, grade: getGrade(total) };
                });

                const remarks = [
                  "Excellent performance this term! Keep up the good work.",
                  "Very good effort! Continue to improve.",
                  "Good performance! There's room for improvement.",
                  "Satisfactory work. More effort needed.",
                  "Fair performance. Needs to study harder.",
                  "Excellent progress! Well done.",
                ];
                const remark =
                  remarks[Math.floor(Math.random() * remarks.length)];

                await resultRef.set({
                  teacherId: teacherUid,
                  parentEmail: studentData.parentEmail || "",
                  className: teacher.className,
                  term,
                  year: academicYear,
                  scores,
                  remark,
                  promotionStatus: "",
                  published: true,
                  updatedAt: new Date(),
                });

                console.log(
                  `Created demo result for ${studentData.name} (${termKey})`,
                );
              } else {
                // If result exists but isn't published, mark it as published
                const existingData = resultSnap.data();
                if (existingData?.published !== true) {
                  await resultRef.update({ published: true });
                  console.log(
                    `Marked existing result for ${studentData.name} (${termKey}) as published`,
                  );
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Failed to process teacher ${teacher.email}:`, error);
      }
    }

    // 3. Create demo parents
    const createdParents: Array<{
      uid: string;
      email: string;
      childCount: number;
    }> = [];
    for (const parent of demoParents) {
      try {
        let parentUid: string;
        try {
          const existingParent = await adminAuth.getUserByEmail(
            parent.email.toLowerCase(),
          );
          parentUid = existingParent.uid;
          console.log(`Demo parent ${parent.email} already exists`);
        } catch {
          // Create new parent
          const userRecord = await adminAuth.createUser({
            email: parent.email.toLowerCase(),
            password: DEMO_PASSWORD,
            displayName: `${parent.firstName} ${parent.lastName}`,
          });
          parentUid = userRecord.uid;

          // Create parent profile
          await adminDb
            .collection("parents")
            .doc(parentUid)
            .set({
              name: `${parent.firstName} ${parent.lastName}`,
              email: parent.email.toLowerCase(),
              createdAt: new Date().toISOString(),
            });

          console.log(`Demo parent ${parent.email} created`);
        }

        createdParents.push({
          uid: parentUid,
          email: parent.email.toLowerCase(),
          childCount: parent.childCount,
        });
      } catch (error) {
        console.error(`Failed to process parent ${parent.email}:`, error);
      }
    }

    // 4. Assign students to parents
    let studentIndex = 0;
    for (const teacherUid of createdTeacherUids) {
      const studentsSnap = await adminDb
        .collection("teachers")
        .doc(teacherUid)
        .collection("students")
        .get();

      const students = studentsSnap.docs;
      for (const studentDoc of students) {
        if (studentIndex >= createdParents.length) {
          studentIndex = 0;
        }
        const parent = createdParents[studentIndex];

        // Update student's parentEmail
        await studentDoc.ref.update({
          parentEmail: parent.email,
        });

        // Also update existing results for this student with the new parent email
        const studentId = studentDoc.id;
        const resultsSnapshot = await adminDb
          .collection("results")
          .doc(studentId)
          .collection("terms")
          .get();
        for (const resultDoc of resultsSnapshot.docs) {
          await resultDoc.ref.update({
            parentEmail: parent.email,
          });
        }

        studentIndex++;
      }
    }

    console.log("Demo setup completed successfully!");
    return NextResponse.json({
      success: true,
      demoAccounts: {
        admin: { email: demoAdmin.email, password: DEMO_PASSWORD },
        teachers: demoTeachers.map((t) => ({ ...t, password: DEMO_PASSWORD })),
        parents: demoParents.map((p) => ({ ...p, password: DEMO_PASSWORD })),
      },
    });
  } catch (error: any) {
    console.error("Demo setup failed:", error);
    return NextResponse.json(
      {
        error: "Failed to set up demo accounts.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
