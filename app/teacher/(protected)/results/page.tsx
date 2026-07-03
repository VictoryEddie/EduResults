"use client";
import Navbar from "@/components/Navbar";
import ErrorMessage from "@/components/ErrorMessage";
import AnimatedButton from "@/components/AnimatedButton";
import Modal from "@/components/Modal";
import PageTransition from "@/components/PageTransition";
import { useToast } from "@/components/Toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import { SkeletonTable } from "@/components/Skeleton";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { getFirestoreError } from "@/lib/firestoreErrors";
import { ACADEMIC_YEARS } from "@/lib/academicYears";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  ClipboardCheck,
  Calendar,
  BookOpen,
  Copy,
  Plus,
  X,
  User,
  Save,
  Send,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

const TERMS = ["First Term", "Second Term", "Third Term"];

interface Student {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  parentEmail: string;
  hasResult?: boolean;
}
interface ScoreRow {
  subject: string;
  ca: string;
  exam: string;
}

function getTotal(ca: string, exam: string) {
  return (parseFloat(ca) || 0) + (parseFloat(exam) || 0);
}
function getGrade(total: number) {
  if (total >= 80) return "A";
  if (total >= 70) return "B";
  if (total >= 60) return "C";
  if (total >= 50) return "D";
  if (total >= 40) return "E";
  return "F";
}

export default function ResultsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  usePageTitle("Enter Results");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [remark, setRemark] = useState("");
  const [promotionStatus, setPromotionStatus] = useState<
    "Promoted" | "Repeated" | ""
  >("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  const [copyFromTerm, setCopyFromTerm] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Helper to get student name
  const getStudentName = (student: Student) => {
    return (
      student.name ||
      `${student.firstName || ""} ${student.lastName || ""}`.trim() ||
      "Unknown Student"
    );
  };

  const selectedStudent = students[currentIndex];
  const selectedStudentName = selectedStudent
    ? getStudentName(selectedStudent)
    : "";
  const termKey =
    selectedYear && selectedTerm ? `${selectedYear}-${selectedTerm}` : "";

  // Fetch students + their result status
  useEffect(() => {
    if (!user || !termKey) return;
    const fetchStudents = async () => {
      const snap = await getDocs(
        collection(db, "teachers", user.uid, "students"),
      );
      const list = await Promise.all(
        snap.docs.map(async (d) => {
          const resultDoc = await getDoc(
            doc(db, "results", d.id, "terms", termKey),
          );
          const data = d.data();
          return {
            id: d.id,
            name: data.name,
            firstName: data.firstName,
            lastName: data.lastName,
            parentEmail: data.parentEmail || "",
            hasResult: resultDoc.exists(),
          };
        }),
      );
      setStudents(list);
      setCurrentIndex(0);
    };
    fetchStudents();
  }, [user, termKey]);

  // Fetch subjects for selected term+year
  useEffect(() => {
    if (!user || !termKey) return;
    setLoading(true);
    getDoc(doc(db, "teachers", user.uid, "subjects", termKey))
      .then((snap) => {
        const list: string[] = snap.exists() ? snap.data().list : [];
        setSubjects(list);
        setScores(list.map((s) => ({ subject: s, ca: "", exam: "" })));
      })
      .catch((err) => setError(getFirestoreError(err.code)))
      .finally(() => setLoading(false));
  }, [user, termKey]);

  // Fetch existing scores when student changes
  useEffect(() => {
    if (!selectedStudent || !termKey || subjects.length === 0) return;
    getDoc(doc(db, "results", selectedStudent.id, "terms", termKey)).then(
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setRemark(data.remark || "");
          setPromotionStatus(data.promotionStatus || "");
          setScores(
            subjects.map((s) => {
              const found = data.scores?.find((r: ScoreRow) => r.subject === s);
              return {
                subject: s,
                ca: found?.ca?.toString() || "",
                exam: found?.exam?.toString() || "",
              };
            }),
          );
        } else {
          setRemark("");
          setPromotionStatus("");
          setScores(subjects.map((s) => ({ subject: s, ca: "", exam: "" })));
        }
      },
    );
  }, [selectedStudent, termKey, subjects]);

  // Fetch available terms for copy feature
  useEffect(() => {
    if (!user || !termKey) return;
    getDocs(collection(db, "teachers", user.uid, "subjects")).then((snap) => {
      setAvailableTerms(
        snap.docs.map((d) => d.id).filter((id) => id !== termKey),
      );
    });
  }, [user, termKey]);

  const handleAddSubject = async () => {
    if (!newSubject.trim() || !user || !termKey) return;
    if (subjects.includes(newSubject.trim())) {
      setError("Subject already exists.");
      return;
    }
    const updated = [...subjects, newSubject.trim()];
    await setDoc(doc(db, "teachers", user.uid, "subjects", termKey), {
      list: updated,
    });
    setSubjects(updated);
    setScores([...scores, { subject: newSubject.trim(), ca: "", exam: "" }]);
    setNewSubject("");
  };

  const handleRemoveSubject = async (subject: string) => {
    if (!user || !termKey) return;
    const updated = subjects.filter((s) => s !== subject);
    await setDoc(doc(db, "teachers", user.uid, "subjects", termKey), {
      list: updated,
    });
    setSubjects(updated);
    setScores(scores.filter((s) => s.subject !== subject));
  };

  const handleCopySubjects = async () => {
    if (!copyFromTerm || !user) return;
    const snap = await getDoc(
      doc(db, "teachers", user.uid, "subjects", copyFromTerm),
    );
    if (snap.exists()) {
      const list: string[] = snap.data().list;
      await setDoc(doc(db, "teachers", user.uid, "subjects", termKey), {
        list,
      });
      setSubjects(list);
      setScores(list.map((s) => ({ subject: s, ca: "", exam: "" })));
      showToast("Subjects copied successfully.", "success");
    }
    setShowCopyModal(false);
  };

  const handleScoreChange = (
    index: number,
    field: "ca" | "exam",
    value: string,
  ) => {
    const updated = [...scores];
    updated[index][field] = value;
    setScores(updated);
  };

  const handleSave = async () => {
    setError(null);
    if (!user || !selectedStudent || !termKey) return;

    for (const row of scores) {
      if (row.ca === "" || row.exam === "") {
        setError(`Please enter both CA and Exam scores for ${row.subject}.`);
        return;
      }
      if (parseFloat(row.ca) < 0) {
        setError(`CA score for ${row.subject} cannot be negative.`);
        return;
      }
      if (parseFloat(row.ca) > 40) {
        setError(`CA score for ${row.subject} cannot exceed 40.`);
        return;
      }
      if (parseFloat(row.exam) < 0) {
        setError(`Exam score for ${row.subject} cannot be negative.`);
        return;
      }
      if (parseFloat(row.exam) > 60) {
        setError(`Exam score for ${row.subject} cannot exceed 60.`);
        return;
      }
      if (getTotal(row.ca, row.exam) > 100) {
        setError(`Total for ${row.subject} cannot exceed 100.`);
        return;
      }
    }

    setSaving(true);
    try {
      const formattedScores = scores.map((row) => {
        const total = getTotal(row.ca, row.exam);
        return {
          subject: row.subject,
          ca: parseFloat(row.ca) || 0,
          exam: parseFloat(row.exam) || 0,
          total,
          grade: getGrade(total),
        };
      });

      await setDoc(doc(db, "results", selectedStudent.id, "terms", termKey), {
        teacherId: user.uid,
        parentEmail: selectedStudent.parentEmail, // Store for easier parent access
        className: user.className, // Store class name at time of saving for historical accuracy
        term: selectedTerm,
        year: selectedYear,
        scores: formattedScores,
        remark,
        promotionStatus: selectedTerm === "Third Term" ? promotionStatus : "",
        published: false,
        updatedAt: serverTimestamp(),
      });

      // Update student status
      setStudents((prev) =>
        prev.map((s, i) =>
          i === currentIndex ? { ...s, hasResult: true } : s,
        ),
      );
      showToast(`Results saved for ${selectedStudentName}.`, "success");

      // Auto-advance to next student
      if (currentIndex < students.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setShowDoneModal(true);
      }
    } catch (err: unknown) {
      setError(getFirestoreError((err as { code?: string }).code ?? ""));
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!user || !termKey) return;
    setPublishing(true);
    try {
      const studentIds = students.filter((s) => s.hasResult).map((s) => s.id);
      const res = await fetch("/api/publish-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds,
          term: selectedTerm,
          year: selectedYear,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        let message = `Results published for ${data.published} students.`;
        if (data.mailerConfigured) {
          message += ` ${data.notified} parent(s) notified.`;
          if (data.failed > 0) {
            message += ` Failed to notify: ${data.failedEmails.join(", ")}`;
            showToast(message, "warning");
          } else {
            showToast(message, "success");
          }
        } else {
          message +=
            " Email notifications are disabled (mailer not configured).";
          showToast(message, "warning");
        }
        setShowDoneModal(false);
        // Refresh data to show published state
        const updatedStudents = students.map((s) => ({
          ...s,
          hasResult: true,
        }));
        setStudents(updatedStudents);
      } else {
        showToast(data.error || "Failed to publish results.", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setPublishing(false);
    }
  };

  const completedCount = students.filter((s) => s.hasResult).length;

  return (
    <PageTransition>
      <div className="min-h-screen bg-slate-50 relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-100/30 rounded-full blur-[120px] -z-10" />

        <Navbar role="teacher" />

        <main className="max-w-5xl mx-auto px-6 py-12 relative z-10">
          <Breadcrumbs />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 flex items-center gap-4"
          >
            <div className="p-3 bg-amber-500 rounded-2xl shadow-lg shadow-amber-100">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Enter Results
              </h2>
              <p className="text-slate-500 font-medium">
                Record and publish academic performance
              </p>
            </div>
          </motion.div>

          {/* Year + Term selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-[24px] border border-white shadow-xl shadow-slate-200/30">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                <Calendar className="w-4 h-4 text-blue-600" /> Academic Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setCurrentIndex(0);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              >
                <option value="">-- Select Year --</option>
                {ACADEMIC_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-[24px] border border-white shadow-xl shadow-slate-200/30">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                <BookOpen className="w-4 h-4 text-blue-600" /> Select Term
              </label>
              <select
                value={selectedTerm}
                onChange={(e) => {
                  setSelectedTerm(e.target.value);
                  setCurrentIndex(0);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              >
                <option value="">-- Select Term --</option>
                {TERMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subjects management */}
          {termKey && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-10 bg-white/80 backdrop-blur-md rounded-[32px] p-8 border border-white shadow-xl shadow-slate-200/30"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Class Subjects
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">
                    Define subjects for {selectedTerm} {selectedYear}
                  </p>
                </div>
                {availableTerms.length > 0 && (
                  <button
                    onClick={() => setShowCopyModal(true)}
                    className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors"
                  >
                    <Copy className="w-3 h-3" /> Copy from previous
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-8">
                <AnimatePresence>
                  {subjects.map((s) => (
                    <motion.span
                      key={s}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="flex items-center gap-2 bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2 rounded-full border border-slate-200"
                    >
                      {s}
                      <button
                        onClick={() => handleRemoveSubject(s)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
                {subjects.length === 0 && (
                  <p className="text-sm text-slate-400 font-medium italic">
                    No subjects added yet.
                  </p>
                )}
              </div>

              <div className="flex gap-3 max-w-md">
                <input
                  type="text"
                  placeholder="New subject name..."
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    (e.preventDefault(), handleAddSubject())
                  }
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                />
                <button
                  onClick={handleAddSubject}
                  className="bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </motion.div>
          )}

          {loading && termKey && <SkeletonTable rows={5} />}

          {/* Student navigation */}
          {termKey &&
            !loading &&
            students.length > 0 &&
            subjects.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Progress & Selector Card */}
                <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-200/20">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        {selectedStudentName}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        {completedCount} of {students.length} students completed
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={currentIndex}
                        onChange={(e) =>
                          setCurrentIndex(parseInt(e.target.value))
                        }
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none min-w-[200px]"
                      >
                        {students.map((s, i) => (
                          <option key={s.id} value={i}>
                            {getStudentName(s)} {s.hasResult ? "✓" : ""}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            setCurrentIndex(Math.max(0, currentIndex - 1))
                          }
                          disabled={currentIndex === 0}
                          className="p-2.5 rounded-xl border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-all"
                        >
                          ←
                        </button>
                        <button
                          onClick={() =>
                            setCurrentIndex(
                              Math.min(students.length - 1, currentIndex + 1),
                            )
                          }
                          disabled={currentIndex === students.length - 1}
                          className="p-2.5 rounded-xl border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-all"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <motion.div
                      className="bg-blue-600 h-2 rounded-full shadow-sm shadow-blue-200"
                      animate={{
                        width: `${(completedCount / students.length) * 100}%`,
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* Score entry card */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedStudent?.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-2xl shadow-slate-200/40"
                  >
                    <ErrorMessage message={error} />

                    <div className="overflow-x-auto rounded-2xl border border-slate-100 mb-8">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="text-left px-6 py-4 font-bold uppercase tracking-wider text-[10px]">
                              Subject
                            </th>
                            <th className="text-center px-6 py-4 font-bold uppercase tracking-wider text-[10px]">
                              C/A (30)
                            </th>
                            <th className="text-center px-6 py-4 font-bold uppercase tracking-wider text-[10px]">
                              Exam (70)
                            </th>
                            <th className="text-center px-6 py-4 font-bold uppercase tracking-wider text-[10px]">
                              Total
                            </th>
                            <th className="text-center px-6 py-4 font-bold uppercase tracking-wider text-[10px]">
                              Grade
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {scores.map((row, i) => {
                            const total = getTotal(row.ca, row.exam);
                            const grade =
                              row.ca || row.exam ? getGrade(total) : "-";
                            return (
                              <tr
                                key={row.subject}
                                className="hover:bg-slate-50/50 transition-colors"
                              >
                                <td className="px-6 py-4 font-bold text-slate-900">
                                  {row.subject}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="30"
                                    value={row.ca}
                                    onChange={(e) =>
                                      handleScoreChange(i, "ca", e.target.value)
                                    }
                                    className={`w-20 bg-white border rounded-xl px-3 py-2 text-center text-sm font-bold focus:outline-none transition-all ${parseFloat(row.ca) > 30 ? "border-red-400 bg-red-50 text-red-600" : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"}`}
                                  />
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={row.exam}
                                    onChange={(e) =>
                                      handleScoreChange(
                                        i,
                                        "exam",
                                        e.target.value,
                                      )
                                    }
                                    className={`w-20 bg-white border rounded-xl px-3 py-2 text-center text-sm font-bold focus:outline-none transition-all ${parseFloat(row.exam) > 60 ? "border-red-400 bg-red-50 text-red-600" : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"}`}
                                  />
                                </td>
                                <td
                                  className={`px-6 py-4 text-center font-black text-lg ${total > 100 ? "text-red-500" : "text-slate-900"}`}
                                >
                                  {row.ca || row.exam ? total : "-"}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span
                                    className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-sm ${
                                      grade === "A"
                                        ? "bg-emerald-50 text-emerald-600"
                                        : grade === "F"
                                          ? "bg-rose-50 text-rose-500"
                                          : "bg-amber-50 text-amber-600"
                                    }`}
                                  >
                                    {grade}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                          Teacher&apos;s Remark
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Share your feedback on the student's performance..."
                          value={remark}
                          onChange={(e) => setRemark(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                        />
                      </div>
                      {selectedTerm === "Third Term" && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                            Promotion Status
                          </label>
                          <select
                            value={promotionStatus}
                            onChange={(e) =>
                              setPromotionStatus(
                                e.target.value as "Promoted" | "Repeated" | "",
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                          >
                            <option value="">-- Select Status --</option>
                            <option value="Promoted">Promoted</option>
                            <option value="Repeated">Repeated</option>
                          </select>
                          <p className="text-[10px] text-slate-400 mt-3 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> This will be
                            displayed on the final result sheet.
                          </p>
                        </motion.div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-blue-600 transition-all flex items-center gap-3 shadow-lg shadow-slate-200 disabled:opacity-50"
                      >
                        {saving ? (
                          <Plus className="w-5 h-5 animate-spin" />
                        ) : (
                          <Save className="w-5 h-5" />
                        )}
                        {saving ? "Saving..." : "Save & Continue"}
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}

          {termKey &&
            completedCount === students.length &&
            students.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-10 bg-emerald-600 rounded-[32px] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-emerald-200"
              >
                <div>
                  <h3 className="text-2xl font-black mb-2 flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8" />
                    All Done!
                  </h3>
                  <p className="text-emerald-50 font-medium">
                    Results for all {students.length} students have been
                    recorded.
                  </p>
                </div>
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="bg-white text-emerald-600 px-10 py-4 rounded-2xl font-black hover:bg-emerald-50 transition-all flex items-center gap-3 shadow-xl"
                >
                  {publishing ? "..." : <Send className="w-5 h-5" />}
                  {publishing ? "Publishing..." : "Publish Results"}
                </button>
              </motion.div>
            )}

          {/* Empty States */}
          {!termKey && (
            <div className="bg-white/40 backdrop-blur-sm rounded-[32px] border border-white p-20 text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Ready to start?
              </h3>
              <p className="text-slate-500 font-medium">
                Select an academic year and term above to begin score entry.
              </p>
            </div>
          )}
        </main>

        {/* Modal styling remains standard but with modern touches */}
        <Modal
          open={showCopyModal}
          onClose={() => setShowCopyModal(false)}
          title="Copy Subject List"
        >
          <div className="p-2">
            <p className="text-sm text-slate-500 mb-4 font-medium">
              Choose a previous term to copy its subject configuration:
            </p>
            <select
              value={copyFromTerm}
              onChange={(e) => setCopyFromTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none mb-6"
            >
              <option value="">-- Select Term --</option>
              {availableTerms.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/-/g, " ")}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={handleCopySubjects}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                Copy Now
              </button>
              <button
                onClick={() => setShowCopyModal(false)}
                className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
