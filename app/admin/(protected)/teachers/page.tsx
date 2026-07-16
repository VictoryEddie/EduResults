"use client";
import Navbar from "@/components/Navbar";
import Modal from "@/components/Modal";
import AnimatedButton from "@/components/AnimatedButton";
import { SkeletonTable } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePageTitle } from "@/hooks/usePageTitle";
import Breadcrumbs from "@/components/Breadcrumbs";
import {
  GraduationCap,
  Search,
  Building2,
  Trash2,
  Mail,
  Users,
  UserPlus,
} from "lucide-react";

interface Teacher {
  id: string;
  name: string;
  email: string;
  className: string;
  studentCount: number;
}

export default function AdminTeachersPage() {
  usePageTitle("Manage Teachers");
  const { showToast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [classTarget, setClassTarget] = useState<Teacher | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newClass, setNewClass] = useState("");
  const [newTeacher, setNewTeacher] = useState({
    firstName: "",
    lastName: "",
    email: "",
    className: "",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const fetchTeachers = useCallback(async () => {
    const res = await fetch("/api/admin/teachers");
    const data = await res.json();
    setTeachers(data.teachers ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const res = await fetch("/api/admin/teachers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId: deleteTarget.id }),
    });
    if (res.ok) {
      showToast(`${deleteTarget.name} has been removed.`, "success");
      setDeleteTarget(null);
      fetchTeachers();
    } else {
      showToast("Failed to remove teacher. Please try again.", "error");
    }
    setSaving(false);
  };

  const handleAddTeacher = async () => {
    if (
      !newTeacher.firstName ||
      !newTeacher.lastName ||
      !newTeacher.email ||
      !newTeacher.className ||
      !newTeacher.password ||
      newTeacher.password.length < 8
    ) {
      showToast(
        "Please fill all fields, password must be at least 8 characters.",
        "error",
      );
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTeacher),
    });
    if (res.ok) {
      showToast("Teacher added successfully!", "success");
      setAddModalOpen(false);
      setNewTeacher({
        firstName: "",
        lastName: "",
        email: "",
        className: "",
        password: "",
      });
      fetchTeachers();
    } else {
      const data = await res.json();
      showToast(data.error ?? "Failed to add teacher.", "error");
    }
    setSaving(false);
  };

  const handleUpdateClass = async () => {
    if (!classTarget || !newClass.trim()) {
      showToast("Class name cannot be empty.", "error");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/teachers/class-name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId: classTarget.id,
        className: newClass.trim(),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Class name updated successfully.", "success");
      setClassTarget(null);
      setNewClass("");
      fetchTeachers();
    } else {
      showToast(data.error ?? "Failed to update class name.", "error");
    }
    setSaving(false);
  };

  const filtered = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.className.toLowerCase().includes(search.toLowerCase()),
  );

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
          className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Teachers
              </h2>
              <p className="text-slate-500 font-medium">
                {teachers.length} registered academic staff
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 transition-all"
            >
              <UserPlus className="w-4 h-4" /> Add Teacher
            </button>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff or class..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full md:w-80 bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>
          </div>
        </motion.div>

        {loading ? (
          <SkeletonTable rows={6} />
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
                      Staff Member
                    </th>
                    <th className="text-left px-8 py-5 font-bold uppercase tracking-widest text-[10px]">
                      Class Assigned
                    </th>
                    <th className="text-center px-8 py-5 font-bold uppercase tracking-widest text-[10px]">
                      Students
                    </th>
                    <th className="text-right px-8 py-5 font-bold uppercase tracking-widest text-[10px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {filtered.map((teacher, i) => (
                      <motion.tr
                        key={teacher.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-blue-50/30 transition-colors group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                              {teacher.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">
                                {teacher.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {teacher.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-slate-600 font-bold">
                            <Building2 className="w-4 h-4 text-slate-300" />
                            {teacher.className || (
                              <span className="text-slate-300 font-normal italic">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-black">
                            <Users className="w-3 h-3" /> {teacher.studentCount}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setClassTarget(teacher);
                                setNewClass(teacher.className);
                              }}
                              title="Assign Class"
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            >
                              <Building2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(teacher)}
                              title="Remove Teacher"
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="p-20 text-center">
                  <div className="bg-white/40 backdrop-blur-sm rounded-[32px] border border-white p-12 sm:p-20 text-center shadow-xl shadow-slate-200/40">
                    <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Search className="w-10 h-10 text-blue-500" />
                    </div>
                    <p className="text-slate-500 font-bold text-lg mb-2">No teachers found</p>
                    <p className="text-slate-400 text-sm">No teachers match your search criteria.</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>

      {/* Modals */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove Teacher"
      >
        <div className="p-2">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <Trash2 className="w-8 h-8" />
          </div>
          <p className="text-slate-600 text-center mb-8 font-medium leading-relaxed">
            Are you sure you want to remove{" "}
            <span className="font-black text-slate-900">
              {deleteTarget?.name}
            </span>
            ? Their students will be moved to{" "}
            <span className="text-rose-500 font-bold">orphaned records</span>.
          </p>
          <div className="flex gap-3">
            <button
              disabled={saving}
              onClick={handleDelete}
              className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-black hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
            >
              {saving ? "Processing..." : "Confirm Removal"}
            </button>
            <button
              onClick={() => setDeleteTarget(null)}
              className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Teacher"
      >
        <div className="p-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                First Name
              </label>
              <input
                type="text"
                placeholder="John"
                value={newTeacher.firstName}
                onChange={(e) =>
                  setNewTeacher({ ...newTeacher, firstName: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                Last Name
              </label>
              <input
                type="text"
                placeholder="Doe"
                value={newTeacher.lastName}
                onChange={(e) =>
                  setNewTeacher({ ...newTeacher, lastName: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
              Email
            </label>
            <input
              type="email"
              placeholder="john@school.edu"
              value={newTeacher.email}
              onChange={(e) =>
                setNewTeacher({ ...newTeacher, email: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
              Class Name
            </label>
            <input
              type="text"
              placeholder="e.g. Grade 5A"
              value={newTeacher.className}
              onChange={(e) =>
                setNewTeacher({ ...newTeacher, className: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
              Initial Password
            </label>
            <input
              type="password"
              placeholder="At least 8 characters"
              value={newTeacher.password}
              onChange={(e) =>
                setNewTeacher({ ...newTeacher, password: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div className="flex gap-3 mt-6">
            <button
              disabled={saving}
              onClick={handleAddTeacher}
              className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              {saving ? "Adding..." : "Add Teacher"}
            </button>
            <button
              onClick={() => setAddModalOpen(false)}
              className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!classTarget}
        onClose={() => setClassTarget(null)}
        title="Assign Class"
      >
        <div className="p-2">
          <div className="flex items-center gap-4 bg-emerald-50 p-6 rounded-[24px] mb-8">
            <div className="p-3 bg-emerald-600 rounded-xl">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                Teacher
              </p>
              <p className="text-xl font-black text-emerald-700">
                {classTarget?.name}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-black text-slate-700 mb-2 ml-1">
              Assigned Class Name
            </label>
            <input
              type="text"
              placeholder="e.g. Grade 5A"
              value={newClass}
              onChange={(e) => setNewClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="flex gap-3">
            <button
              disabled={saving}
              onClick={handleUpdateClass}
              className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200"
            >
              {saving ? "Updating..." : "Update Assignment"}
            </button>
            <button
              onClick={() => setClassTarget(null)}
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
