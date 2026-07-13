"use client";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import { SkeletonDashboard } from "@/components/Skeleton";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, easeOut } from "framer-motion";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useRouter } from "next/navigation";
import {
  Users,
  FileCheck,
  Clock,
  TrendingUp,
  Award,
  TrendingDown,
  UserPlus,
  PenSquare,
  Eye,
  Printer,
  ChevronRight,
  Edit3,
  RefreshCw,
  Calendar,
  BookOpen,
} from "lucide-react";
import { ACADEMIC_YEARS } from "@/lib/academicYears";

const TERMS = ["First Term", "Second Term", "Third Term"];

interface ClassSummary {
  totalStudents: number;
  resultsUploaded: number;
  classAverage: number;
  highest: number;
  lowest: number;
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
  }),
};

export default function TeacherDashboard() {
  usePageTitle("Teacher Dashboard");
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<ClassSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingClass, setEditingClass] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [savingClass, setSavingClass] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);

  const termKey =
    selectedYear && selectedTerm ? `${selectedYear}-${selectedTerm}` : "";

  // Fetch available terms that have data
  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "teachers", user.uid, "subjects")).then((snap) => {
      const terms = snap.docs.map((d) => d.id);
      setAvailableTerms(terms);
      // Auto-select the most recent term if available
      if (terms.length > 0 && !selectedYear && !selectedTerm) {
        const mostRecent = terms[0];
        const [year, ...termParts] = mostRecent.split("-");
        setSelectedYear(year);
        setSelectedTerm(termParts.join("-"));
      }
    });
  }, [user]);

  const fetchSummary = async () => {
    if (!user || !termKey) return;

    setErrorMsg(null);
    try {
      const studentsSnap = await getDocs(
        collection(db, "teachers", user.uid, "students"),
      );
      let uploaded = 0;
      const totals: number[] = [];

      for (const studentDoc of studentsSnap.docs) {
        const resultDoc = await getDoc(
          doc(db, "results", studentDoc.id, "terms", termKey),
        );
        if (resultDoc.exists()) {
          uploaded++;
          const scores = resultDoc.data().scores ?? [];
          const studentTotal = scores.reduce(
            (sum: number, s: { total: number }) => sum + s.total,
            0,
          );
          if (scores.length > 0) totals.push(studentTotal / scores.length);
        }
      }

      const newSummary = {
        totalStudents: studentsSnap.size,
        resultsUploaded: uploaded,
        classAverage: totals.length
          ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length)
          : 0,
        highest: totals.length ? Math.round(Math.max(...totals)) : 0,
        lowest: totals.length ? Math.round(Math.min(...totals)) : 0,
      };

      setSummary(newSummary);

      // Update the cache per term
      await updateDoc(doc(db, "teachers", user.uid), {
        [`cachedStats_${termKey}`]: newSummary,
      });
    } catch (err) {
      console.error("Failed to fetch dashboard summary:", err);
      setErrorMsg(
        "Failed to load dashboard data. Please check your connection.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      setErrorMsg(
        "Your session could not be fully verified. Please log out and log in again.",
      );
      return;
    }

    setNewClassName(user.className ?? "");
    if (termKey) {
      fetchSummary();
    } else {
      setLoading(false);
    }
  }, [user, authLoading, router, termKey]);

  const handleSaveClassName = async () => {
    if (!user || !newClassName.trim()) return;
    setSavingClass(true);
    await updateDoc(doc(db, "teachers", user.uid), {
      className: newClassName.trim(),
    });
    setSavingClass(false);
    setEditingClass(false);
    window.location.reload();
  };

  if (authLoading || loading)
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar role="teacher" />
        <main className="max-w-5xl mx-auto px-6 py-12">
          <SkeletonDashboard />
        </main>
      </div>
    );

  if (errorMsg)
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar role="teacher" />
        <main className="max-w-4xl mx-auto px-6 py-12">
          <div className="bg-red-50 text-red-600 p-8 rounded-[32px] border border-red-100 flex flex-col items-center justify-center text-center shadow-xl shadow-red-100/50">
            <p className="mb-6 font-medium">{errorMsg}</p>
            <button
              onClick={() => {
                fetch("/api/session", { method: "DELETE" }).then(() =>
                  router.push("/teacher/login"),
                );
              }}
              className="bg-red-600 text-white px-6 py-3 rounded-2xl shadow-lg hover:bg-red-700 transition-all font-bold"
            >
              Force Log Out
            </button>
          </div>
        </main>
      </div>
    );

  const statCards = [
    {
      label: "Total Students",
      value: summary?.totalStudents ?? 0,
      color: "text-slate-900",
      icon: Users,
      bg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Results Uploaded",
      value: summary?.resultsUploaded ?? 0,
      color: "text-amber-600",
      icon: FileCheck,
      bg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "Pending",
      value: (summary?.totalStudents ?? 0) - (summary?.resultsUploaded ?? 0),
      color: "text-slate-900",
      icon: Clock,
      bg: "bg-slate-100",
      iconColor: "text-slate-600",
    },
    {
      label: "Class Average",
      value: `${summary?.classAverage ?? 0}%`,
      color: "text-emerald-600",
      icon: TrendingUp,
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Highest Avg",
      value: `${summary?.highest ?? 0}%`,
      color: "text-blue-600",
      icon: Award,
      bg: "bg-indigo-50",
      iconColor: "text-indigo-600",
    },
    {
      label: "Lowest Avg",
      value: `${summary?.lowest ?? 0}%`,
      color: "text-rose-500",
      icon: TrendingDown,
      bg: "bg-rose-50",
      iconColor: "text-rose-500",
    },
  ];

  const quickActions = [
    {
      href: "/teacher/students",
      icon: UserPlus,
      label: "Manage Students",
      desc: "Add or remove students",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      href: "/teacher/results",
      icon: PenSquare,
      label: "Enter Results",
      desc: "Score entry and term selection",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      href: "/teacher/preview",
      icon: Eye,
      label: "Preview & Export",
      desc: "Review, edit and export results",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      href: "/teacher/print",
      icon: Printer,
      label: "Print Results",
      desc: "Generate individual result sheets",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-slate-50 relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-100/30 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-amber-100/20 rounded-full blur-[120px] -z-10" />

        <Navbar role="teacher" />

        <main className="max-w-5xl mx-auto px-6 py-12 relative z-10">
          <Breadcrumbs />

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
                onChange={(e) => setSelectedTerm(e.target.value)}
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

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div>
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight capitalize">
                Welcome,{" "}
                <span className="text-blue-600">
                  {user?.name?.split(" ")[0]}
                </span>
              </h2>
              <div className="flex items-center gap-3 mt-2">
                {editingClass ? (
                  <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <input
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="bg-transparent px-3 py-1 text-sm font-medium focus:outline-none w-32"
                    />
                    <button
                      onClick={handleSaveClassName}
                      disabled={savingClass}
                      className="bg-slate-900 text-white text-xs px-4 py-1.5 rounded-lg hover:bg-blue-600 transition-colors font-bold"
                    >
                      {savingClass ? "..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingClass(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 px-2"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-slate-500 font-medium">
                      Class:{" "}
                      <span className="text-slate-900">{user?.className}</span>
                    </p>
                    <button
                      onClick={() => setEditingClass(true)}
                      className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <button
                onClick={() => {
                  setRefreshing(true);
                  fetchSummary();
                }}
                disabled={loading || refreshing}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh Stats
              </button>
            </div>
          </motion.div>

          {!termKey ? (
            <div className="bg-white/40 backdrop-blur-sm rounded-[32px] border border-white p-20 text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Select a Term
              </h3>
              <p className="text-slate-500 font-medium">
                Choose an academic year and term above to view class statistics.
              </p>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {statCards.map((card, i) => (
                  <motion.div
                    key={card.label}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="show"
                    className="bg-white/70 backdrop-blur-md rounded-[28px] p-6 border border-white shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-500/5 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`p-3 rounded-2xl ${card.bg} ${card.iconColor}`}
                      >
                        <card.icon className="w-6 h-6" />
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {card.label}
                    </p>
                    <p
                      className={`text-4xl font-black mt-1 tracking-tight ${card.color}`}
                    >
                      {card.value}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Quick Actions */}
              <h3 className="text-xl font-bold text-slate-900 mb-6 px-2">
                Quick Management
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quickActions.map((action, i) => (
                  <motion.div
                    key={action.href}
                    custom={i + 6}
                    variants={cardVariants}
                    initial="hidden"
                    animate="show"
                  >
                    <Link
                      href={action.href}
                      className="group flex items-center gap-5 bg-white rounded-[32px] p-6 border border-slate-100 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                        <ChevronRight className="w-6 h-6 text-blue-500" />
                      </div>

                      <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${action.bg} ${action.color}`}
                      >
                        <action.icon className="w-8 h-8" />
                      </div>

                      <div className="flex-1">
                        <p className="font-bold text-xl text-slate-900 group-hover:text-blue-600 transition-colors">
                          {action.label}
                        </p>
                        <p className="text-sm text-slate-400 font-medium mt-1">
                          {action.desc}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </PageTransition>
  );
}
