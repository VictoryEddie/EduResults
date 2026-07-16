"use client";
import Navbar from "@/components/Navbar";
import Modal from "@/components/Modal";
import ErrorMessage from "@/components/ErrorMessage";
import PageTransition from "@/components/PageTransition";
import { SkeletonTable } from "@/components/Skeleton";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  serverTimestamp,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { getFirestoreError } from "@/lib/firestoreErrors";
import { usePageTitle } from "@/hooks/usePageTitle";
import Breadcrumbs from "@/components/Breadcrumbs";
import {
  Users,
  UserPlus,
  X,
  Trash2,
  ShieldCheck,
  Edit3,
  Mail,
  User,
} from "lucide-react";

interface Student {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  parentEmail: string;
}

export default function StudentsPage() {
  usePageTitle("Manage Students");
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState({ name: "", parentEmail: "" });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [savingDelete, setSavingDelete] = useState(false);

  const fetchStudents = async () => {
    if (!user) return;
    try {
      const snap = await getDocs(
        collection(db, "teachers", user.uid, "students"),
      );
      setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Student));
    } catch (err: unknown) {
      setError(getFirestoreError((err as { code?: string }).code ?? ""));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) return;

    const duplicate = students.find((s) => {
      const sName = s.name || `${s.firstName || ""} ${s.lastName || ""}`.trim();
      return sName.toLowerCase() === form.name.toLowerCase();
    });
    if (duplicate) {
      setError("A student with this name already exists in your class.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "teachers", user.uid, "students"), {
        name: form.name,
        parentEmail: form.parentEmail.toLowerCase(),
        createdAt: serverTimestamp(),
      });
      setForm({ name: "", parentEmail: "" });
      setShowForm(false);
      await fetchStudents();
    } catch (err: unknown) {
      setError(getFirestoreError((err as { code?: string }).code ?? ""));
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (student: Student) => {
    const fullName =
      student.name ||
      `${student.firstName || ""} ${student.lastName || ""}`.trim();
    setEditTarget(student);
    setEditName(fullName);
    setEditEmail(student.parentEmail);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!user || !editTarget) return;
    if (!editName.trim()) {
      setEditError("Student name cannot be empty.");
      return;
    }
    if (!editEmail.trim()) {
      setEditError("Parent email cannot be empty.");
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      const updates: Record<string, string> = {};
      const oldName =
        editTarget.name ||
        `${editTarget.firstName || ""} ${editTarget.lastName || ""}`.trim();

      if (editName.trim() !== oldName) {
        updates.name = editName.trim();
      }
      if (editEmail.trim().toLowerCase() !== editTarget.parentEmail) {
        updates.parentEmail = editEmail.trim().toLowerCase();
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(
          doc(db, "teachers", user.uid, "students", editTarget.id),
          updates,
        );

        // Write audit log entries to the server
        if (updates.name) {
          await fetch("/api/admin/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "student_name_updated",
              studentId: editTarget.id,
              oldName,
              newName: updates.name,
              teacherId: user.uid,
              teacherName: user.name,
              className: user.className,
            }),
          }).catch(() => {}); // Non-blocking — don't fail the edit if audit fails
        }
        if (updates.parentEmail) {
          await fetch("/api/admin/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "student_email_updated",
              studentId: editTarget.id,
              studentName: updates.name ?? oldName,
              oldEmail: editTarget.parentEmail,
              newEmail: updates.parentEmail,
              teacherId: user.uid,
              teacherName: user.name,
              className: user.className,
            }),
          }).catch(() => {});
        }

        setStudents(
          students.map((s) =>
            s.id === editTarget.id ? { ...s, ...updates } : s,
          ),
        );
      }
      setEditTarget(null);
    } catch (err: unknown) {
      setEditError(getFirestoreError((err as { code?: string }).code ?? ""));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRemove = async () => {
    if (!user || !deleteTarget) return;
    setSavingDelete(true);
    try {
      const studentDoc = students.find((s) => s.id === deleteTarget.id);
      if (!studentDoc) return;

      const fullName =
        studentDoc.name ||
        `${studentDoc.firstName || ""} ${studentDoc.lastName || ""}`.trim();

      const batch = writeBatch(db);
      batch.set(doc(db, "orphanedStudents", deleteTarget.id), {
        ...studentDoc,
        originalTeacherId: user.uid,
        originalTeacherName: user.name,
        originalClassName: user.className,
        orphanedAt: serverTimestamp(),
        archivedByTeacher: true,
      });
      batch.delete(doc(db, "teachers", user.uid, "students", deleteTarget.id));
      await batch.commit();

      // Write audit log
      await fetch("/api/admin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "student_removed",
          studentId: deleteTarget.id,
          studentName: fullName,
          parentEmail: studentDoc.parentEmail,
          teacherId: user.uid,
          teacherName: user.name,
          className: user.className,
        }),
      }).catch(() => {});

      setStudents(students.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      setError(getFirestoreError((err as { code?: string }).code ?? ""));
      setDeleteTarget(null);
    } finally {
      setSavingDelete(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-slate-50 relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-amber-100/30 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-purple-100/30 rounded-full blur-[120px] -z-10" />

        <Navbar role="teacher" />

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12 relative z-10">
          <Breadcrumbs />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  Students
                </h2>
                <p className="text-slate-500 font-medium">
                  {students.length} active student{students.length !== 1 ? "s" : ""} in your class
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowForm(!showForm)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg ${showForm ? "bg-slate-200 text-slate-600 hover:bg-slate-300 shadow-none" : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100"}`}
            >
              {showForm ? (
                <X className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {showForm ? "Cancel" : "Add Student"}
            </motion.button>
          </motion.div>

          <ErrorMessage message={error} />

          <AnimatePresence>
            {showForm && (
              <motion.form
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onSubmit={handleAdd}
                className="bg-white/80 backdrop-blur-md rounded-[32px] p-6 mb-10 border border-white shadow-xl shadow-slate-200/40 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <UserPlus className="w-24 h-24" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  Register New Student
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                      Student Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                      Parent Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="parent@example.com"
                      value={form.parentEmail}
                      onChange={(e) =>
                        setForm({ ...form, parentEmail: e.target.value })
                      }
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-60 shadow-lg shadow-blue-200"
                  >
                    {saving ? "Registering..." : "Complete Registration"}
                  </motion.button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {loading ? (
            <SkeletonTable rows={5} />
          ) : students.length === 0 ? (
            <div className="bg-white/40 backdrop-blur-sm rounded-[32px] border border-white p-12 sm:p-20 text-center shadow-xl shadow-slate-200/40">
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                No students yet
              </h3>
              <p className="text-slate-500 font-medium">
                Your class roster is currently empty.
              </p>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.05 } },
              }}
              className="grid grid-cols-1 gap-3"
            >
              {students.map((student) => {
                const fullName =
                  student.name ||
                  `${student.firstName || ""} ${student.lastName || ""}`.trim();
                const initial = fullName ? fullName.charAt(0).toUpperCase() : "?";

                return (
                  <motion.div
                    key={student.id}
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      show: { opacity: 1, y: 0 },
                    }}
                    className="group flex items-center bg-white rounded-[20px] px-5 py-4 border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all"
                  >
                    {/* Avatar */}
                    <div className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors flex-shrink-0">
                      <span className="text-base font-bold text-slate-400 group-hover:text-blue-600 transition-colors">
                        {initial}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="ml-4 flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-base leading-tight truncate">
                        {fullName || "Unknown Student"}
                      </p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                        {student.parentEmail}
                      </p>
                    </div>

                    {/* Action buttons — always visible, sized for touch */}
                    <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                      <button
                        onClick={() => openEditModal(student)}
                        title="Edit student"
                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(student)}
                        title="Remove student"
                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </main>
      </div>

      {/* ── Edit Student Modal ─────────────────────────────── */}
      <Modal
        open={!!editTarget}
        onClose={() => { setEditTarget(null); setEditError(null); }}
        title="Edit Student"
      >
        <div className="p-2 space-y-5">
          {/* Student name indicator */}
          <div className="flex items-center gap-4 bg-blue-50 p-5 rounded-[20px]">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-lg">
                {editTarget
                  ? (editTarget.name || `${editTarget.firstName || ""} ${editTarget.lastName || ""}`.trim()).charAt(0).toUpperCase()
                  : ""}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                Editing Student
              </p>
              <p className="text-lg font-black text-blue-700 leading-tight">
                {editTarget?.name ||
                  `${editTarget?.firstName || ""} ${editTarget?.lastName || ""}`.trim()}
              </p>
            </div>
          </div>

          {editError && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl font-medium">
              {editError}
            </p>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2 ml-1">
              <User className="w-4 h-4 text-blue-600" /> Student Full Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2 ml-1">
              <Mail className="w-4 h-4 text-blue-600" /> Parent Email Address
            </label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="parent@example.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-2 ml-1">
              Changing this email will immediately affect which parent can view this student's results.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              disabled={savingEdit}
              onClick={handleSaveEdit}
              className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-60"
            >
              {savingEdit ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => { setEditTarget(null); setEditError(null); }}
              className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirmation Modal ──────────────────────── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove Student"
      >
        <div className="p-2">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <Trash2 className="w-8 h-8" />
          </div>
          <p className="text-slate-600 text-center mb-2 font-medium leading-relaxed">
            Are you sure you want to remove{" "}
            <span className="font-black text-slate-900">
              {deleteTarget?.name ||
                `${deleteTarget?.firstName || ""} ${deleteTarget?.lastName || ""}`.trim()}
            </span>{" "}
            from your class?
          </p>
          <p className="text-center text-xs text-slate-400 mb-8 leading-relaxed">
            Their record will be moved to{" "}
            <span className="text-rose-500 font-bold">orphaned students</span>{" "}
            and remain visible to the admin. This action is{" "}
            <span className="font-bold">logged</span>.
          </p>
          <div className="flex gap-3">
            <button
              disabled={savingDelete}
              onClick={handleRemove}
              className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-black hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 disabled:opacity-60"
            >
              {savingDelete ? "Removing..." : "Yes, Remove Student"}
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
    </PageTransition>
  );
}
