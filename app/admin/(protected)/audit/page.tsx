"use client";
import Navbar from "@/components/Navbar";
import { SkeletonTable } from "@/components/Skeleton";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePageTitle } from "@/hooks/usePageTitle";
import Breadcrumbs from "@/components/Breadcrumbs";
import {
  ClipboardList,
  Clock,
  ShieldAlert,
  UserPlus,
  UserMinus,
  Key,
  CheckCircle2,
  Calendar,
  History,
  BookOpen,
  UserCircle2,
} from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  timestamp: string;
  // Admin related
  email?: string;
  name?: string;
  reason?: string;
  ip?: string;
  // Teacher related
  teacherName?: string;
  teacherId?: string;
  className?: string;
  newClassName?: string;
  // Parent related
  parentName?: string;
  parentId?: string;
  // Shared removal fields
  targetName?: string;
  targetEmail?: string;
  targetId?: string;
  studentsOrphaned?: number;
  // Publish results
  term?: string;
  classNamePublished?: string;
  teacherNamePublished?: string;
  studentCount?: number;
  // Orphan assign
  studentName?: string;
  newTeacherName?: string;
}

const actionConfig: Record<
  string,
  { label: string; icon: any; color: string; bg: string }
> = {
  admin_login: {
    label: "Admin Access",
    icon: Clock,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  admin_registered: {
    label: "System Init",
    icon: UserPlus,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  teacher_created: {
    label: "Staff Created",
    icon: UserPlus,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  teacher_removed: {
    label: "Staff Removal",
    icon: UserMinus,
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  parent_created: {
    label: "Parent Created",
    icon: UserPlus,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  parent_removed: {
    label: "User Removal",
    icon: UserMinus,
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  student_reassigned: {
    label: "Reassignment",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  access_key_updated: {
    label: "Security Update",
    icon: Key,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  class_name_updated: {
    label: "Class Name Updated",
    icon: BookOpen,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  child_linked: {
    label: "Record Link",
    icon: CheckCircle2,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  results_published: {
    label: "Publish Event",
    icon: ClipboardList,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  admin_login_failed: {
    label: "Security Alert",
    icon: ShieldAlert,
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
};

function getInvolvedParty(entry: AuditEntry): string {
  switch (entry.action) {
    case "admin_login":
    case "admin_login_failed":
    case "admin_registered":
      return entry.name || entry.email || "—";
    case "teacher_created":
    case "teacher_removed":
      return entry.teacherName || entry.targetName || "—";
    case "parent_created":
    case "parent_removed":
      return entry.parentName || entry.targetName || "—";
    case "class_name_updated":
      return entry.teacherName || "—";
    case "results_published":
      return entry.teacherNamePublished || entry.teacherName || "—";
    case "student_reassigned":
      return entry.studentName || "—";
    default:
      return entry.targetName || entry.name || "—";
  }
}

function getContextData(entry: AuditEntry): string {
  switch (entry.action) {
    case "admin_login":
    case "admin_login_failed":
      return [entry.email, entry.reason, entry.ip].filter(Boolean).join(" • ");
    case "admin_registered":
      return [entry.email, entry.ip].filter(Boolean).join(" • ");
    case "teacher_created":
      return [entry.email, entry.className].filter(Boolean).join(" • ");
    case "teacher_removed":
      return [entry.targetEmail, `${entry.studentsOrphaned} students orphaned`]
        .filter(Boolean)
        .join(" • ");
    case "parent_created":
      return entry.email || "—";
    case "parent_removed":
      return entry.targetEmail || "—";
    case "class_name_updated":
      return entry.newClassName || "—";
    case "results_published":
      return [
        entry.classNamePublished || entry.className,
        entry.term,
        `${entry.studentCount} students`,
      ]
        .filter(Boolean)
        .join(" • ");
    case "student_reassigned":
      return [entry.newTeacherName, entry.newClassName]
        .filter(Boolean)
        .join(" • ");
    default:
      return (
        entry.targetEmail ||
        entry.email ||
        entry.className ||
        entry.ip ||
        "No additional data"
      );
  }
}

export default function AuditLogPage() {
  usePageTitle("Audit Log");
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/audit")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-slate-200/40 rounded-full blur-[120px] -z-10" />

      <Navbar role="admin" />

      <main className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        <Breadcrumbs />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex items-center gap-4"
        >
          <div className="p-3 bg-slate-900 rounded-2xl shadow-lg shadow-slate-200">
            <History className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Audit Log
            </h2>
            <p className="text-slate-500 font-medium">
              Immutable record of administrative activities
            </p>
          </div>
        </motion.div>

        {loading ? (
          <SkeletonTable rows={8} />
        ) : entries.length === 0 ? (
          <div className="bg-white/40 backdrop-blur-sm rounded-[32px] border border-white p-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-400 font-bold italic">
              No actions recorded in the system yet.
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 backdrop-blur-md rounded-[32px] border border-white shadow-2xl shadow-slate-200/40 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 text-slate-500">
                  <tr>
                    <th className="text-left px-8 py-5 font-bold uppercase tracking-widest text-[10px]">
                      Security Event
                    </th>
                    <th className="text-left px-8 py-5 font-bold uppercase tracking-widest text-[10px]">
                      Involved Party
                    </th>
                    <th className="text-left px-8 py-5 font-bold uppercase tracking-widest text-[10px]">
                      Context / Data
                    </th>
                    <th className="text-right px-8 py-5 font-bold uppercase tracking-widest text-[10px]">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {entries.map((entry, i) => {
                      const config = actionConfig[entry.action] ?? {
                        label: entry.action.replace(/_/g, " "),
                        icon: ClipboardList,
                        color: "text-slate-600",
                        bg: "bg-slate-50",
                      };
                      return (
                        <motion.tr
                          key={entry.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2 rounded-lg ${config.bg} ${config.color}`}
                              >
                                <config.icon className="w-4 h-4" />
                              </div>
                              <span
                                className={`text-xs font-black uppercase tracking-wider ${config.color}`}
                              >
                                {config.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <p className="font-bold text-slate-900">
                              {getInvolvedParty(entry)}
                            </p>
                          </td>
                          <td className="px-8 py-5">
                            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[300px]">
                              {getContextData(entry)}
                            </p>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-1.5 text-slate-600 font-bold text-xs">
                                <Calendar className="w-3 h-3 text-slate-300" />
                                {new Date(entry.timestamp).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[10px] mt-1">
                                <Clock className="w-3 h-3 text-slate-200" />
                                {new Date(entry.timestamp).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
