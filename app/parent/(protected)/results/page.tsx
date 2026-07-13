"use client";
import Navbar from "@/components/Navbar";
import PageTransition from "@/components/PageTransition";
import AnimatedButton from "@/components/AnimatedButton";
import { SkeletonResults } from "@/components/Skeleton";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getFirestoreError } from "@/lib/firestoreErrors";
import { exportResult, ExportFormat } from "@/lib/exportResults";
import { ACADEMIC_YEARS } from "@/lib/academicYears";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import {
  Trophy,
  TrendingUp,
  Calendar,
  BookOpen,
  Download,
  ArrowLeftRight,
  Medal,
  Star,
  CheckCircle2,
  ChevronDown,
  User,
  GraduationCap,
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
interface TermResult {
  termKey: string;
  term: string;
  year: string;
  scores: ScoreRow[];
  remark: string;
  teacherName: string;
  position: string;
  totalStudents: number;
  promotionStatus?: string;
}

function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getOverallGrade(avg: number) {
  if (avg >= 80)
    return {
      grade: "A",
      label: "Excellent",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    };
  if (avg >= 70)
    return {
      grade: "B",
      label: "Very Good",
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    };
  if (avg >= 60)
    return {
      grade: "C",
      label: "Good",
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    };
  if (avg >= 50)
    return {
      grade: "D",
      label: "Average",
      color: "text-orange-500",
      bg: "bg-orange-50",
      border: "border-orange-100",
    };
  return {
    grade: "F",
    label: "Below Average",
    color: "text-rose-500",
    bg: "bg-rose-50",
    border: "border-rose-100",
  };
}

function ResultsContent() {
  usePageTitle("View Results");
  const { settings } = useSchoolSettings();
  const params = useSearchParams();
  const studentId = params.get("studentId") || "";
  const childName = params.get("name") || "Student";
  const className = params.get("class") || "";

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [result, setResult] = useState<TermResult | null>(null);
  const [compareResult, setCompareResult] = useState<TermResult | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [compareYear, setCompareYear] = useState("");
  const [compareTerm, setCompareTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchResult = async (
    year: string,
    term: string,
  ): Promise<TermResult | null> => {
    const termKey = `${year}-${term}`;

    const fetchWithRetry = async (docRef: any, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const snap = await getDoc(docRef);
          return snap;
        } catch (err: any) {
          if (err.code === "permission-denied" && i < retries - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
            continue;
          }
          throw err;
        }
      }
      return null;
    };

    const resultDoc = await fetchWithRetry(
      doc(db, "results", studentId, "terms", termKey),
    );
    if (!resultDoc || !resultDoc.exists()) return null;
    const data = resultDoc.data() as any;

    if (data.published === false) return null;

    let teacherName = "";
    let position = "";
    let totalStudents = 0;

    if (data.teacherId) {
      const teacherDoc = await fetchWithRetry(
        doc(db, "teachers", data.teacherId),
      );
      if (teacherDoc && teacherDoc.exists())
        teacherName = (teacherDoc.data() as any).name;

      // Use pre-calculated position if available
      if (data.position) {
        position = getOrdinal(data.position);
        totalStudents = data.totalStudents || 0;
      }
    }

    return {
      termKey,
      term,
      year,
      scores: data.scores || [],
      remark: data.remark || "",
      teacherName,
      position,
      totalStudents,
      promotionStatus: data.promotionStatus || "",
    };
  };

  useEffect(() => {
    if (!selectedTerm || !selectedYear || !studentId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    fetchResult(selectedYear, selectedTerm)
      .then((r) => {
        if (!r) setError("No published results available for this term yet.");
        else setResult(r);
      })
      .catch((err) =>
        setError(getFirestoreError((err as { code?: string }).code ?? "")),
      )
      .finally(() => setLoading(false));
  }, [selectedTerm, selectedYear, studentId]);

  const handleCompare = async () => {
    if (!compareYear || !compareTerm) return;
    setCompareLoading(true);
    const r = await fetchResult(compareYear, compareTerm).catch(() => null);
    setCompareResult(r);
    setCompareLoading(false);
  };

  const handleExport = async (format: ExportFormat) => {
    if (!result) return;
    setExporting(true);
    await exportResult(
      {
        studentName: childName,
        className,
        term: result.term,
        year: result.year,
        teacherName: result.teacherName,
        scores: result.scores,
        remark: result.remark,
        position: result.position,
        ...settings,
      },
      format,
    );
    setExporting(false);
  };

  const avg = result
    ? Math.round(
        result.scores.reduce((s, r) => s + r.total, 0) /
          (result.scores.length || 1),
      )
    : 0;
  const overall = getOverallGrade(avg);

  return (
    <PageTransition>
      <div className="min-h-screen bg-slate-50 relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-100/20 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-emerald-100/20 rounded-full blur-[120px] -z-10" />

        <Navbar role="parent" />

        <main className="max-w-4xl mx-auto px-6 py-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight capitalize">
                  {childName}
                </h2>
                <p className="text-slate-500 font-medium">{className}</p>
              </div>
            </div>
          </motion.div>

          {/* Year + Term selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Academic Year
              </label>
              <div className="relative group">
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setResult(null);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-sm"
                >
                  <option value="">Select Year</option>
                  {ACADEMIC_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:rotate-180 transition-transform" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" /> Select Term
              </label>
              <div className="relative group">
                <select
                  value={selectedTerm}
                  onChange={(e) => {
                    setSelectedTerm(e.target.value);
                    setResult(null);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-sm"
                >
                  <option value="">Select Term</option>
                  {TERMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:rotate-180 transition-transform" />
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SkeletonResults />
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-rose-50 border border-rose-100 rounded-[32px] p-12 text-center shadow-xl shadow-rose-500/5"
              >
                <Medal className="w-12 h-12 text-rose-300 mx-auto mb-4" />
                <p className="text-rose-600 font-bold mb-2">No Records Found</p>
                <p className="text-rose-500/70 text-sm max-w-xs mx-auto">
                  {error}
                </p>
              </motion.div>
            ) : result ? (
              <motion.div
                key={result.termKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Performance Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div
                    className={`col-span-1 md:col-span-2 ${overall.bg} ${overall.border} border rounded-[32px] p-8 relative overflow-hidden flex items-center justify-between shadow-xl shadow-slate-200/50`}
                  >
                    <div className="relative z-10">
                      <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />{" "}
                        Academic Standing
                      </p>
                      <div className="flex items-baseline gap-3">
                        <span
                          className={`text-7xl font-black ${overall.color}`}
                        >
                          {overall.grade}
                        </span>
                        <span
                          className={`text-xl font-extrabold ${overall.color} opacity-80 uppercase`}
                        >
                          {overall.label}
                        </span>
                      </div>
                      <div className="mt-6 flex items-center gap-3">
                        <div className="bg-white/60 backdrop-blur px-4 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-sm border border-white/50">
                          Average: {avg}%
                        </div>
                        {result.promotionStatus && (
                          <div
                            className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm border ${result.promotionStatus === "Promoted" ? "bg-emerald-500 text-white border-emerald-400" : "bg-rose-500 text-white border-rose-400"}`}
                          >
                            {result.promotionStatus}
                          </div>
                        )}
                      </div>
                    </div>
                    <Trophy
                      className={`w-32 h-32 ${overall.color} opacity-10 absolute -right-6 -bottom-6`}
                    />
                  </div>

                  <div className="bg-slate-900 rounded-[32px] p-8 text-white flex flex-col justify-between shadow-xl shadow-slate-900/10">
                    <div>
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-6">
                        Class Position
                      </p>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-black tracking-tight">
                              {result.position || "N/A"}
                            </p>
                            <p className="text-xs text-slate-400 font-medium">
                              {result.totalStudents
                                ? `Rank (out of ${result.totalStudents})`
                                : "Class Rank"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                            <User className="w-5 h-5 text-slate-300" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-100">
                              {result.teacherName}
                            </p>
                            <p className="text-xs text-slate-400 font-medium">
                              Class Teacher
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <AnimatedButton
                      onClick={() => handleExport("pdf")}
                      loading={exporting}
                      className="mt-8 bg-blue-600 hover:bg-blue-500 text-white border-none py-4 rounded-2xl flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Export Report
                    </AnimatedButton>
                  </div>
                </div>

                {/* Main Scores Table */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                  <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-500" /> Subject
                      Performance
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-50">
                          <th className="text-left px-8 py-4">Subject</th>
                          <th className="text-center px-4 py-4">
                            Continuous Assessment
                          </th>
                          <th className="text-center px-4 py-4">Exam Score</th>
                          <th className="text-center px-4 py-4">Term Total</th>
                          <th className="text-center px-8 py-4">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {result.scores.map((row) => (
                          <tr
                            key={row.subject}
                            className="group hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-8 py-5">
                              <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                {row.subject}
                              </p>
                            </td>
                            <td className="px-4 py-5 text-center font-medium text-slate-500">
                              {row.ca}
                            </td>
                            <td className="px-4 py-5 text-center font-medium text-slate-500">
                              {row.exam}
                            </td>
                            <td className="px-4 py-5 text-center">
                              <span className="bg-slate-100 text-slate-900 px-3 py-1.5 rounded-lg font-bold text-sm">
                                {row.total}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <span
                                className={`text-lg font-black ${row.grade === "A" ? "text-emerald-600" : row.grade === "F" ? "text-rose-500" : "text-blue-600"}`}
                              >
                                {row.grade}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Remark Section */}
                <div className="bg-blue-600 rounded-[32px] p-10 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <CheckCircle2 className="w-24 h-24" />
                  </div>
                  <p className="text-blue-200 font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Medal className="w-4 h-4 text-white" /> Teacher&apos;s
                    Professional Remark
                  </p>
                  <p className="text-2xl font-bold italic tracking-tight leading-relaxed">
                    &quot;{result.remark}&quot;
                  </p>
                </div>

                {/* Compare Section */}
                <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-xl shadow-slate-200/40">
                  <button
                    onClick={() => setShowCompare(!showCompare)}
                    className="w-full flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                        <ArrowLeftRight className="w-5 h-5 text-slate-500 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          Performance Comparison
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                          Compare current results with previous academic terms
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-300 transition-transform ${showCompare ? "rotate-180" : ""}`}
                    />
                  </button>

                  <AnimatePresence>
                    {showCompare && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-8 pt-8 border-t border-slate-50 overflow-hidden"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                              Historical Year
                            </label>
                            <select
                              value={compareYear}
                              onChange={(e) => setCompareYear(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
                            >
                              <option value="">Year</option>
                              {ACADEMIC_YEARS.map((y) => (
                                <option key={y} value={y}>
                                  {y}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                              Historical Term
                            </label>
                            <select
                              value={compareTerm}
                              onChange={(e) => setCompareTerm(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
                            >
                              <option value="">Term</option>
                              {TERMS.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </div>
                          <AnimatedButton
                            onClick={handleCompare}
                            loading={compareLoading}
                            className="py-3 rounded-xl font-bold"
                          >
                            View Comparison
                          </AnimatedButton>
                        </div>

                        {compareResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-8"
                          >
                            <div className="bg-slate-50 rounded-2xl p-4 mb-6">
                              <p className="text-xs font-bold text-slate-500 text-center">
                                Comparing{" "}
                                <span className="text-blue-600">
                                  {result.term} {result.year}
                                </span>{" "}
                                with{" "}
                                <span className="text-slate-900">
                                  {compareResult.term} {compareResult.year}
                                </span>
                              </p>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="text-[10px] text-slate-400 uppercase tracking-widest">
                                    <th className="text-left px-4 py-3">
                                      Subject
                                    </th>
                                    <th className="text-center px-4 py-3">
                                      Current
                                    </th>
                                    <th className="text-center px-4 py-3">
                                      Previous
                                    </th>
                                    <th className="text-center px-4 py-3">
                                      Progress
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {result.scores.map((row) => {
                                    const comp = compareResult.scores.find(
                                      (r) => r.subject === row.subject,
                                    );
                                    const diff = comp
                                      ? row.total - comp.total
                                      : null;
                                    return (
                                      <tr key={row.subject}>
                                        <td className="px-4 py-3 font-bold text-sm text-slate-700">
                                          {row.subject}
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm font-bold">
                                          {row.total}
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-slate-400">
                                          {comp?.total ?? "—"}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          {diff === null ? (
                                            <span className="text-slate-300 text-xs">
                                              —
                                            </span>
                                          ) : diff > 0 ? (
                                            <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[10px] font-black">
                                              +{diff}
                                            </span>
                                          ) : diff < 0 ? (
                                            <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded text-[10px] font-black">
                                              {diff}
                                            </span>
                                          ) : (
                                            <span className="bg-slate-100 text-slate-400 px-2 py-1 rounded text-[10px] font-black">
                                              0
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 gap-4"
              >
                <div className="w-20 h-20 bg-slate-100 rounded-[32px] flex items-center justify-center">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold text-sm">
                  Select an academic term to reveal the scorecard.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </PageTransition>
  );
}

export default function ParentResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm font-medium">
          Initializing secure view...
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
