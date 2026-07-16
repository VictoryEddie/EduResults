"use client";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, easeOut } from "framer-motion";
import { SkeletonDashboard } from "@/components/Skeleton";
import { usePageTitle } from "@/hooks/usePageTitle";
import ErrorMessage from "@/components/ErrorMessage";
import Breadcrumbs from "@/components/Breadcrumbs";
import {
  GraduationCap,
  Users,
  UserSquare2,
  AlertTriangle,
  UserX,
  Settings,
  ClipboardList,
  ChevronRight,
  ShieldCheck,
  Building2,
} from "lucide-react";

interface Stats {
  totalTeachers: number;
  totalParents: number;
  totalStudents: number;
  orphanedStudents: number;
  orphanedTeachers: number;
  adminName: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
  }),
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [schoolName, setSchoolName] = useState("EduResults");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageTitle("Admin Dashboard");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/settings").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([statsData, settingsData]) => {
        if (statsData) setStats(statsData.stats);
        if (settingsData?.settings?.schoolName)
          setSchoolName(settingsData.settings.schoolName);
      })
      .catch(() =>
        setError("Failed to load dashboard data. Please refresh the page."),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar role="admin" />
        <main className="max-w-5xl mx-auto px-6 py-12">
          <SkeletonDashboard />
        </main>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar role="admin" />
        <main className="max-w-5xl mx-auto px-6 py-12">
          <ErrorMessage message={error} />
        </main>
      </div>
    );

  const statCards = [
    {
      label: "Total Teachers",
      value: stats?.totalTeachers ?? 0,
      color: "text-blue-600",
      icon: GraduationCap,
      bg: "bg-blue-50",
    },
    {
      label: "Total Parents",
      value: stats?.totalParents ?? 0,
      color: "text-indigo-600",
      icon: Users,
      bg: "bg-indigo-50",
    },
    {
      label: "Total Students",
      value: stats?.totalStudents ?? 0,
      color: "text-amber-600",
      icon: UserSquare2,
      bg: "bg-amber-50",
    },
    {
      label: "Orphaned Students",
      value: stats?.orphanedStudents ?? 0,
      color: "text-rose-500",
      icon: AlertTriangle,
      bg: "bg-rose-50",
    },
    {
      label: "Orphaned Teachers",
      value: stats?.orphanedTeachers ?? 0,
      color: "text-rose-500",
      icon: UserX,
      bg: "bg-rose-50",
    },
  ];

  const quickActions = [
    {
      href: "/admin/teachers",
      icon: GraduationCap,
      label: "Manage Teachers",
      desc: "Add, remove, assign access keys",
      color: "text-slate-600",
      bg: "bg-slate-100",
    },
    {
      href: "/admin/parents",
      icon: Users,
      label: "Manage Parents",
      desc: "View and remove parent accounts",
      color: "text-slate-600",
      bg: "bg-slate-100",
    },
    {
      href: "/admin/orphaned",
      icon: AlertTriangle,
      label: "Orphaned Records",
      desc: "Reassign students and classes",
      color: "text-slate-600",
      bg: "bg-slate-100",
    },
    {
      href: "/admin/audit",
      icon: ClipboardList,
      label: "Audit Log",
      desc: "View all admin actions",
      color: "text-slate-600",
      bg: "bg-slate-100",
    },
    {
      href: "/admin/settings",
      icon: Settings,
      label: "School Settings",
      desc: "School name, motto, and logo",
      color: "text-slate-600",
      bg: "bg-slate-100",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-amber-100/30 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-purple-100/30 rounded-full blur-[120px] -z-10" />

      <Navbar role="admin" />

      <main className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        <Breadcrumbs />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-blue-600 rounded-2xl">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              {schoolName}
            </h2>
          </div>
          <p className="text-slate-500 font-medium ml-12">
            Administrative Command Center
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="show"
              className="bg-white/70 backdrop-blur-md rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 border border-white shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-500/5 transition-all group"
            >
              <div
                className={`w-10 h-10 rounded-xl ${card.bg} ${card.color} flex items-center justify-center mb-4`}
              >
                <card.icon className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {card.label}
              </p>
              <p className={`text-xl sm:text-2xl font-black mt-1 ${card.color}`}>
                {card.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <h3 className="text-xl font-bold text-slate-900 mb-6 px-2 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          System Management
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.href}
              custom={i + 5}
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
      </main>
    </div>
  );
}
