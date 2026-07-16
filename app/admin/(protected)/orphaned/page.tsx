"use client";
import Navbar from "@/components/Navbar";
import Modal from "@/components/Modal";
import AnimatedButton from "@/components/AnimatedButton";
import { SkeletonTable } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePageTitle } from "@/hooks/usePageTitle";
import Breadcrumbs from "@/components/Breadcrumbs";
import { 
  AlertTriangle, 
  UserPlus, 
  Mail, 
  History, 
  GraduationCap, 
  CheckCircle2,
  ChevronRight,
  ShieldAlert
} from "lucide-react";

interface OrphanedStudent {
  id: string;
  name: string;
  parentEmail: string;
  originalTeacherName: string;
  originalClassName: string;
  orphanedAt: string;
}

interface Teacher {
  id: string;
  name: string;
  className: string;
}

export default function OrphanedPage() {
  usePageTitle("Orphaned Records");
  const { showToast } = useToast();
  const [students, setStudents] = useState<OrphanedStudent[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignTarget, setAssignTarget] = useState<OrphanedStudent | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const [studentsRes, teachersRes] = await Promise.all([
      fetch("/api/admin/orphaned"),
      fetch("/api/admin/teachers"),
    ]);
    const studentsData = await studentsRes.json();
    const teachersData = await teachersRes.json();
    setStudents(studentsData.students ?? []);
    setTeachers(teachersData.teachers ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAssign = async () => {
    if (!assignTarget || !selectedTeacher) {
      showToast("Please select a teacher.", "error");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/orphaned/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: assignTarget.id, teacherId: selectedTeacher }),
    });
    if (res.ok) {
      showToast(`${assignTarget.name} has been reassigned.`, "success");
      setAssignTarget(null);
      setSelectedTeacher("");
      fetchData();
    } else {
      const data = await res.json();
      showToast(data.error ?? "Failed to reassign student.", "error");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-amber-100/30 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-purple-100/30 rounded-full blur-[120px] -z-10" />
      
      <Navbar role="admin" />
      
      <main className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        <Breadcrumbs />
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Orphaned Records</h2>
            <p className="text-slate-500 font-medium">Reassign students who lost their teacher access</p>
          </div>
        </motion.div>

        {loading ? <SkeletonTable rows={4} /> : students.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white/40 backdrop-blur-sm rounded-[32px] border border-white p-12 sm:p-20 text-center shadow-xl shadow-slate-200/40">
            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">System Clean</h3>
            <p className="text-slate-500 font-medium">All students are currently assigned to active teachers.</p>
          </motion.div>
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
                    <th className="text-left px-8 py-5 font-bold uppercase tracking-widest text-[10px]">Orphaned Student</th>
                    <th className="text-left px-8 py-5 font-bold uppercase tracking-widest text-[10px]">Previous Context</th>
                    <th className="text-left px-8 py-5 font-bold uppercase tracking-widest text-[10px]">Date Orphaned</th>
                    <th className="text-right px-8 py-5 font-bold uppercase tracking-widest text-[10px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {students.map((student, i) => (
                      <motion.tr 
                        key={student.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-rose-50/30 transition-colors group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-400 group-hover:bg-rose-500 group-hover:text-white transition-all">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{student.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {student.parentEmail}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                              <GraduationCap className="w-3 h-3 text-slate-300" />
                              {student.originalTeacherName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Class: {student.originalClassName}
                            </p>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-slate-400 font-medium text-xs">
                            <History className="w-3.5 h-3.5" />
                            {new Date(student.orphanedAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex justify-end">
                            <button 
                              onClick={() => { setAssignTarget(student); setSelectedTeacher(""); }}
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-xs font-black transition-all shadow-lg shadow-blue-100"
                            >
                              <UserPlus className="w-3.5 h-3.5" /> Reassign
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </main>

      <Modal open={!!assignTarget} onClose={() => setAssignTarget(null)} title="Restore Student Access">
        <div className="p-2">
          <div className="flex items-center gap-4 bg-blue-50 p-6 rounded-[24px] mb-8">
            <div className="p-3 bg-blue-600 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Reassigning</p>
              <p className="text-xl font-black text-blue-700">{assignTarget?.name}</p>
            </div>
          </div>
          
          <div className="mb-8">
            <label className="block text-sm font-black text-slate-700 mb-3 ml-1 uppercase tracking-widest text-[10px]">Select Receiving Teacher</label>
            <div className="relative">
              <select 
                value={selectedTeacher} 
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
              >
                <option value="">-- Choose Staff Member --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.className})</option>
                ))}
              </select>
              <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              disabled={saving}
              onClick={handleAssign}
              className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
            >
              {saving ? "Processing..." : "Confirm Reassignment"}
            </button>
            <button 
              onClick={() => setAssignTarget(null)}
              className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
