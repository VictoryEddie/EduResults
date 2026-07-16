"use client";
import Navbar from "@/components/Navbar";
import AnimatedButton from "@/components/AnimatedButton";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useReactToPrint } from "react-to-print";
import { motion, AnimatePresence } from "framer-motion";
import { usePageTitle } from "@/hooks/usePageTitle";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Printer, FileText, AlertCircle, Loader2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────

interface ScoreRow { subject: string; ca: number; exam: number; total: number; grade: string; }

function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function PrintContent() {
  const { user } = useAuth();
  const params = useSearchParams();
  const studentId = params.get("studentId") || "";
  const term = params.get("term") || "";
  const printRef = useRef<HTMLDivElement>(null);
  usePageTitle("Print Result");

  const [settings, setSettings] = useState({
    schoolName: "EduResults",
    location: "Loading...",
    motto: "",
    logo: null as string | null,
  });

  const [studentName, setStudentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [remark, setRemark] = useState("");
  const [promotionStatus, setPromotionStatus] = useState("");
  const [position, setPosition] = useState("");
  const [totalStudents, setTotalStudents] = useState(0);
  const [termEndDate, setTermEndDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Convert term key like "2025-2026-First Term" to "2025/2026 — First Term" */
  const termDisplay = (() => {
    const knownTerms = ["First Term", "Second Term", "Third Term"];
    for (const t of knownTerms) {
      if (term.endsWith(t)) {
        const year = term.replace(`-${t}`, "").replace("-", "/");
        return `${year} — ${t}`;
      }
    }
    return term;
  })();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${studentName} - ${term} Result`,
  });

  useEffect(() => {
    /* Fetch school branding first */
    fetch("/api/admin/settings")
      .then(res => res.json())
      .then(data => {
        if (data.settings) setSettings(data.settings);
      })
      .catch(() => console.error("Could not load school settings"));

    if (!studentId || !term || !user) return;
    const fetchData = async () => {
      try {
        const studentDoc = await getDoc(doc(db, "teachers", user.uid, "students", studentId));
        if (!studentDoc.exists()) { setError("Student not found."); setLoading(false); return; }
        setStudentName(studentDoc.data().name);
        setParentEmail(studentDoc.data().parentEmail ?? "");

        const resultDoc = await getDoc(doc(db, "results", studentId, "terms", term));
        if (!resultDoc.exists()) { setError("No results found for this student and term."); setLoading(false); return; }
        const data = resultDoc.data();
        setScores(data.scores || []);
        setRemark(data.remark || "");
        setPromotionStatus(data.promotionStatus || "");
        setTermEndDate(data.termEndDate ?? null);

        // Use pre-calculated rank if available
        if (data.position) {
          setPosition(getOrdinal(data.position));
          setTotalStudents(data.totalStudents || 0);
        } else {
          // Fallback to calculation if not yet published or pre-calculated
          const allStudents = await getDocs(collection(db, "teachers", user.uid, "students"));
          setTotalStudents(allStudents.size);
          const studentTotal = (data.scores || []).reduce((sum: number, r: ScoreRow) => sum + r.total, 0);
          const totals: number[] = [];
          for (const s of allStudents.docs) {
            if (s.id === studentId) continue;
            const r = await getDoc(doc(db, "results", s.id, "terms", term));
            if (r.exists()) totals.push((r.data().scores || []).reduce((sum: number, row: ScoreRow) => sum + row.total, 0));
          }
          const rank = totals.filter((t) => t > studentTotal).length + 1;
          setPosition(getOrdinal(rank));
        }
      } catch {
        setError("Failed to load result data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentId, term, user]);

  if (!studentId || !term) return (
    <div className="min-h-screen bg-slate-50">
      <Navbar role="teacher" />
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-12 h-12 text-slate-300" />
        <p className="text-slate-500 font-medium">No student selected. Go to <a href="/teacher/preview" className="text-blue-600 underline">Preview</a> and click Print.</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <Navbar role="teacher" />
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-bold tracking-widest uppercase text-xs animate-pulse">Preparing Report...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50">
      <Navbar role="teacher" />
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-12 h-12 text-rose-400" />
        <p className="text-rose-500 font-medium">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-amber-100/30 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-purple-100/30 rounded-full blur-[120px] -z-10" />
      
      <Navbar role="teacher" />
      
      <main className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        <Breadcrumbs />
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 no-print">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Print Result</h2>
              <p className="text-slate-500 font-medium">Official academic report for {studentName}</p>
            </div>
          </div>
          <button 
            onClick={() => handlePrint()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-xl shadow-blue-200"
          >
            <Printer className="w-5 h-5" /> Print / Save PDF
          </button>
        </motion.div>

        {/* The Print Container */}
        <div ref={printRef} className="bg-white rounded-[32px] p-10 md:p-16 border border-white shadow-2xl shadow-slate-200/40 print:shadow-none print:border-none print:rounded-none">
          {/* School Header */}
          <div className="text-center mb-10 border-b border-slate-100 pb-10">
            {settings.logo && (
              <img src={settings.logo} alt="School Logo" className="w-24 h-24 object-contain mx-auto mb-6" />
            )}
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{settings.schoolName}</h1>
            <p className="text-slate-500 font-bold mt-2">{settings.location}</p>
            {settings.motto && (
              <p className="text-sm text-slate-400 italic mt-1 font-medium">&ldquo;{settings.motto}&rdquo;</p>
            )}
            <div className="inline-block bg-slate-900 text-white px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mt-6">
              Official Academic Report
            </div>
          </div>

          {/* Student Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-12 mb-12">
            <InfoItem label="Student Name" value={studentName} bold />
            <InfoItem label="Class" value={user?.className || "—"} />
            <InfoItem label="Academic Term" value={termDisplay} />
            <InfoItem label="Term End Date" value={termEndDate ? new Date(termEndDate).toLocaleDateString() : "—"} />
            <InfoItem label="Class Position" value={position} highlight />
            <InfoItem label="Total in Class" value={totalStudents.toString()} />
            <InfoItem label="Guardian Email" value={parentEmail} />
            {promotionStatus && (
              <InfoItem 
                label="Promotion Status" 
                value={promotionStatus} 
                statusColor={promotionStatus === "Promoted" ? "text-emerald-600" : "text-rose-500"} 
              />
            )}
          </div>

          {/* Result Table */}
          <div className="overflow-x-auto rounded-[24px] border border-slate-100 mb-10">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-8 py-5 font-bold uppercase tracking-widest text-[10px]">Subject</th>
                  <th className="text-center px-8 py-5 font-bold uppercase tracking-widest text-[10px]">C/A (40)</th>
                  <th className="text-center px-8 py-5 font-bold uppercase tracking-widest text-[10px]">Exam (60)</th>
                  <th className="text-center px-8 py-5 font-bold uppercase tracking-widest text-[10px]">Total (100)</th>
                  <th className="text-center px-8 py-5 font-bold uppercase tracking-widest text-[10px]">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {scores.map((row, i) => (
                  <tr key={row.subject} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 font-black text-slate-900">{row.subject}</td>
                    <td className="px-8 py-5 text-center font-bold text-slate-600">{row.ca}</td>
                    <td className="px-8 py-5 text-center font-bold text-slate-600">{row.exam}</td>
                    <td className="px-8 py-5 text-center font-black text-xl text-slate-900">{row.total}</td>
                    <td className="px-8 py-5 text-center">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-sm ${
                        row.grade === "A" ? "bg-emerald-50 text-emerald-600" : 
                        row.grade === "F" ? "bg-rose-50 text-rose-500" : 
                        "bg-amber-50 text-amber-600"
                      }`}>
                        {row.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Remark Section */}
          <div className="mb-12">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Teacher&apos;s Remark</p>
            <div className="bg-slate-50 rounded-[28px] px-8 py-6 text-slate-700 font-medium leading-relaxed italic border border-slate-100 shadow-inner">
              &ldquo;{remark || "No additional remarks provided."}&rdquo;
            </div>
          </div>

          {/* Signature Section */}
          <div className="flex justify-between items-end pt-10 border-t border-slate-100">
            <div className="text-center">
              <div className="w-48 border-b-2 border-slate-900 mb-2" />
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Class Teacher Signature</p>
              <p className="text-sm font-bold text-slate-500 mt-1">{user?.name}</p>
            </div>
            <div className="text-center">
              <div className="w-48 border-b-2 border-slate-900 mb-2" />
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Principal / Head Teacher</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoItem({ label, value, bold, highlight, statusColor }: { 
  label: string; 
  value: string; 
  bold?: boolean; 
  highlight?: boolean;
  statusColor?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
      <p className={`text-sm ${bold ? 'font-black text-slate-900' : 'font-bold text-slate-600'} ${highlight ? 'text-amber-600' : ''} ${statusColor || ''}`}>
        {value}
      </p>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    }>
      <PrintContent />
    </Suspense>
  );
}
