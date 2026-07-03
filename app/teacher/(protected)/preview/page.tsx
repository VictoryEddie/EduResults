"use client";
import Navbar from "@/components/Navbar";
import ErrorMessage from "@/components/ErrorMessage";
import AnimatedButton from "@/components/AnimatedButton";
import PageTransition from "@/components/PageTransition";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { getFirestoreError } from "@/lib/firestoreErrors";
import {
  exportResult,
  exportClassResults,
  ExportFormat,
  ExportData,
} from "@/lib/exportResults";
import { ACADEMIC_YEARS } from "@/lib/academicYears";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import Breadcrumbs from "@/components/Breadcrumbs";
import {
  Eye,
  Calendar,
  BookOpen,
  User,
  Download,
  FileJson,
  FileSpreadsheet,
  Printer,
  Edit3,
  Check,
  AlertCircle,
  Search,
} from "lucide-react";

const TERMS = ["First Term", "Second Term", "Third Term"];

interface ScoreRow {
  subject: string;
  ca: number;
  exam: number;
  total: number;
  grade: string;
}
interface Student {
  id: string;
  name: string;
}

/** Converts a numeric total into a letter grade */
function getGrade(total: number) {
  if (total >= 80) return "A";
  if (total >= 70) return "B";
  if (total >= 60) return "C";
  if (total >= 50) return "D";
  if (total >= 40) return "E";
  return "F";
}

/** Converts a number to an ordinal string e.g. 1 → "1st", 11 → "11th", 22 → "22nd" */
function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function PreviewPage() {
  usePageTitle("Preview Results");
  const { user } = useAuth();
  const { settings } = useSchoolSettings();

  /* Page state — filters, result data, and UI flags */
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [draftScores, setDraftScores] = useState<ScoreRow[]>([]);
  const [remark, setRemark] = useState("");
  const [editing, setEditing] = useState(false);
  const [position, setPosition] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Load the teacher's student list once on mount */
  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "teachers", user.uid, "students")).then((snap) =>
      setStudents(snap.docs.map((d) => ({ id: d.id, name: d.data().name }))),
    );
  }, [user]);

  /* Fetch result and calculate class position whenever the three filters change */
  useEffect(() => {
    if (!selectedStudentId || !selectedTerm || !selectedYear || !user) return;
    setLoading(true);
    setError(null);
    const termKey = `${selectedYear}-${selectedTerm}`;

    const fetchResult = async () => {
      try {
        const snap = await getDoc(
          doc(db, "results", selectedStudentId, "terms", termKey),
        );
        if (!snap.exists()) {
          setScores([]);
          setRemark("");
          setPosition("");
          setLoading(false);
          return;
        }

        const data = snap.data();
        setScores(data.scores || []);
        setDraftScores(data.scores || []);
        setRemark(data.remark || "");

        /* Calculate provisional position by comparing this student's total
           against all other students who have results for the same term */
        const allStudents = await getDocs(
          collection(db, "teachers", user.uid, "students"),
        );
        const studentTotal = (data.scores || []).reduce(
          (sum: number, r: ScoreRow) => sum + r.total,
          0,
        );
        const totals: number[] = [];
        for (const s of allStudents.docs) {
          if (s.id === selectedStudentId) continue;
          const r = await getDoc(doc(db, "results", s.id, "terms", termKey));
          if (r.exists()) {
            totals.push(
              (r.data().scores || []).reduce(
                (sum: number, row: ScoreRow) => sum + row.total,
                0,
              ),
            );
          }
        }
        const rank = totals.filter((t) => t > studentTotal).length + 1;
        setPosition(`${getOrdinal(rank)} out of ${allStudents.size}`);
      } catch (err: unknown) {
        setError(getFirestoreError((err as { code?: string }).code ?? ""));
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [selectedStudentId, selectedTerm, selectedYear, user]);

  /* Enter edit mode — copy saved scores into a draft so originals are preserved until Done */
  const handleEdit = () => {
    setDraftScores(scores.map((s) => ({ ...s })));
    setEditing(true);
  };

  /* Save edits — recalculate totals/grades from draft and write back to Firestore */
  const handleDone = async () => {
    if (!user || !selectedStudentId || !selectedTerm || !selectedYear) return;
    const termKey = `${selectedYear}-${selectedTerm}`;
    setSaving(true);
    try {
      const updated = draftScores.map((row) => ({
        ...row,
        total: row.ca + row.exam,
        grade: getGrade(row.ca + row.exam),
      }));
      await setDoc(doc(db, "results", selectedStudentId, "terms", termKey), {
        teacherId: user.uid,
        className: user.className, // Preserve class name for historical accuracy
        term: selectedTerm,
        year: selectedYear,
        scores: updated,
        remark,
        updatedAt: serverTimestamp(),
      });
      setScores(updated);
      setEditing(false);
    } catch (err: unknown) {
      setError(getFirestoreError((err as { code?: string }).code ?? ""));
    } finally {
      setSaving(false);
    }
  };

  /* Update a single score field in the draft as the teacher types */
  const handleScoreChange = (
    index: number,
    field: "ca" | "exam",
    value: string,
  ) => {
    const updated = [...draftScores];
    updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
    setDraftScores(updated);
  };

  const student = students.find((s) => s.id === selectedStudentId);
  const termKey =
    selectedYear && selectedTerm ? `${selectedYear}-${selectedTerm}` : "";

  /* Trigger file download in the chosen format using the current saved scores */
  const handleExport = async (format: ExportFormat) => {
    if (!student || !scores.length) return;
    setExporting(true);
    await exportResult(
      {
        studentName: student.name,
        className: user?.className ?? "",
        term: selectedTerm,
        year: selectedYear,
        teacherName: user?.name ?? "",
        scores,
        remark,
        position,
        ...settings,
      },
      format,
    );
    setExporting(false);
  };

  /* Bulk export — fetches results for EVERY student in the class and combines them */
  const handleBulkExport = async (format: ExportFormat) => {
    if (!selectedYear || !selectedTerm || !user) return;
    setLoading(true);
    setExporting(true);
    const termKey = `${selectedYear}-${selectedTerm}`;
    try {
      const dataList: ExportData[] = [];
      const studentsSnap = await getDocs(
        collection(db, "teachers", user.uid, "students"),
      );

      /* First, collect all student names/ids and their total scores to calculate positions */
      const studentResults = await Promise.all(
        studentsSnap.docs.map(async (sDoc) => {
          const rSnap = await getDoc(
            doc(db, "results", sDoc.id, "terms", termKey),
          );
          if (!rSnap.exists()) return null;
          const rData = rSnap.data();
          const total = (rData.scores || []).reduce(
            (sum: number, r: ScoreRow) => sum + r.total,
            0,
          );
          return { id: sDoc.id, name: sDoc.data().name, data: rData, total };
        }),
      );

      const activeResults = studentResults.filter((r) => r !== null);
      const allTotals = activeResults.map((r) => r!.total);

      /* Build the full ExportData for each student */
      activeResults.forEach((r) => {
        if (!r) return;
        const rank = allTotals.filter((t) => t > r.total).length + 1;
        dataList.push({
          studentName: r.name,
          className: user.className || "",
          term: selectedTerm,
          year: selectedYear,
          teacherName: user.name || "",
          scores: r.data.scores || [],
          remark: r.data.remark || "",
          position: `${getOrdinal(rank)} out of ${studentsSnap.size}`,
          ...settings,
        });
      });

      if (dataList.length === 0) {
        setError("No results found for any student in this term.");
      } else {
        await exportClassResults(dataList, format);
      }
    } catch (err: unknown) {
      setError("Failed to generate bulk export.");
      console.error(err);
    } finally {
      setLoading(false);
      setExporting(false);
    }
  };

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
            <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-100">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Preview Results
              </h2>
              <p className="text-slate-500 font-medium">
                Review, edit, and export performance reports
              </p>
            </div>
          </motion.div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-[24px] border border-white shadow-xl shadow-slate-200/30">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                <Calendar className="w-4 h-4 text-blue-600" /> Academic Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setScores([]);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                  setScores([]);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="">-- Select Term --</option>
                {TERMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-[24px] border border-white shadow-xl shadow-slate-200/30">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                <User className="w-4 h-4 text-blue-600" /> Select Student
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="">-- Select Student --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulk Export Section */}
          <AnimatePresence>
            {selectedYear && selectedTerm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-slate-900 rounded-[28px] p-8 mb-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-slate-200"
              >
                <div className="flex items-center gap-5 text-center md:text-left">
                  <div className="p-4 bg-white/10 rounded-2xl">
                    <Download className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">
                      Bulk Class Export
                    </h3>
                    <p className="text-slate-400 text-sm font-medium mt-1">
                      Download results for the entire class at once.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    disabled={exporting || loading}
                    onClick={() => handleBulkExport("csv")}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold transition-all border border-white/10"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> CSV
                  </button>
                  <button
                    disabled={exporting || loading}
                    onClick={() => handleBulkExport("pdf")}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
                  >
                    <FileJson className="w-4 h-4" /> PDF
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 font-bold animate-pulse tracking-widest uppercase text-xs">
                Fetching Records...
              </p>
            </div>
          )}

          <ErrorMessage message={error} />

          {/* Result Card */}
          <AnimatePresence mode="wait">
            {!loading &&
            student &&
            selectedTerm &&
            selectedYear &&
            scores.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[32px] p-8 md:p-10 border border-slate-100 shadow-2xl shadow-slate-200/40"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
                      <span className="text-2xl font-black text-blue-600">
                        {student.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                        {student.name}
                      </h3>
                      <p className="text-slate-500 font-bold flex items-center gap-2 mt-1">
                        {selectedTerm} {selectedYear}{" "}
                        <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />{" "}
                        {user?.className}
                      </p>
                      {position && (
                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1 rounded-lg text-xs font-black mt-2">
                          <AlertCircle className="w-3 h-3" /> Position:{" "}
                          {position}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={editing ? handleDone : handleEdit}
                      disabled={saving}
                      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black transition-all shadow-lg ${editing ? "bg-emerald-600 text-white shadow-emerald-100" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
                    >
                      {editing ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Edit3 className="w-4 h-4" />
                      )}
                      {saving
                        ? "Saving..."
                        : editing
                          ? "Save Changes"
                          : "Edit Results"}
                    </button>
                    <Link
                      href={`/teacher/print?studentId=${selectedStudentId}&term=${encodeURIComponent(termKey)}`}
                      className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-black hover:bg-blue-600 transition-all shadow-lg shadow-slate-200"
                    >
                      <Printer className="w-4 h-4" /> Print
                    </Link>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-[24px] border border-slate-50 mb-10">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="text-left px-8 py-5 font-bold uppercase tracking-widest text-[10px]">
                          Subject
                        </th>
                        <th className="text-center px-8 py-5 font-bold uppercase tracking-widest text-[10px]">
                          C/A
                        </th>
                        <th className="text-center px-8 py-5 font-bold uppercase tracking-widest text-[10px]">
                          Exam
                        </th>
                        <th className="text-center px-8 py-5 font-bold uppercase tracking-widest text-[10px]">
                          Total
                        </th>
                        <th className="text-center px-8 py-5 font-bold uppercase tracking-widest text-[10px]">
                          Grade
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(editing ? draftScores : scores).map((row, i) => {
                        const total = editing ? row.ca + row.exam : row.total;
                        const grade = getGrade(total);
                        return (
                          <tr
                            key={row.subject}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-8 py-5 font-black text-slate-900">
                              {row.subject}
                            </td>
                            <td className="px-8 py-5 text-center">
                              {editing ? (
                                <input
                                  type="number"
                                  min="0"
                                  max="40"
                                  value={row.ca}
                                  onChange={(e) =>
                                    handleScoreChange(i, "ca", e.target.value)
                                  }
                                  className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-2 text-center text-sm font-black focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                                />
                              ) : (
                                <span className="font-bold text-slate-600">
                                  {row.ca}
                                </span>
                              )}
                            </td>
                            <td className="px-8 py-5 text-center">
                              {editing ? (
                                <input
                                  type="number"
                                  min="0"
                                  max="60"
                                  value={row.exam}
                                  onChange={(e) =>
                                    handleScoreChange(i, "exam", e.target.value)
                                  }
                                  className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-2 text-center text-sm font-black focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                                />
                              ) : (
                                <span className="font-bold text-slate-600">
                                  {row.exam}
                                </span>
                              )}
                            </td>
                            <td className="px-8 py-5 text-center font-black text-xl text-slate-900">
                              {total}
                            </td>
                            <td className="px-8 py-5 text-center">
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

                <div className="mb-10">
                  <label className="block text-sm font-black text-slate-700 mb-3 ml-1 uppercase tracking-widest text-[10px]">
                    Teacher&apos;s Remark
                  </label>
                  {editing ? (
                    <textarea
                      rows={4}
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none shadow-inner"
                    />
                  ) : (
                    <div className="bg-slate-50 rounded-[28px] px-8 py-6 text-slate-600 font-medium leading-relaxed border border-slate-100 italic">
                      &ldquo;{remark || "No remark provided."}&rdquo;
                    </div>
                  )}
                </div>

                {!editing && (
                  <div className="pt-8 border-t border-slate-50 flex flex-wrap items-center gap-4">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-2">
                      <Download className="w-4 h-4" /> Export Report:
                    </span>
                    <button
                      disabled={exporting}
                      onClick={() => handleExport("csv")}
                      className="bg-white border border-slate-100 text-slate-600 px-6 py-3 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Excel / CSV
                    </button>
                    <button
                      disabled={exporting}
                      onClick={() => handleExport("pdf")}
                      className="bg-white border border-slate-100 text-slate-600 px-6 py-3 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                      <FileJson className="w-4 h-4" /> PDF Document
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white/40 backdrop-blur-sm rounded-[32px] border border-white p-20 text-center"
                >
                  <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Search className="w-10 h-10 text-blue-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Select Filters
                  </h3>
                  <p className="text-slate-500 font-medium max-w-xs mx-auto">
                    {student &&
                    selectedTerm &&
                    selectedYear &&
                    scores.length === 0
                      ? `No results found for ${student.name} in this term.`
                      : "Pick a student and academic term to preview results."}
                  </p>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </main>
      </div>
    </PageTransition>
  );
}
