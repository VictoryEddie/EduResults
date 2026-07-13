"use client";
import Navbar from "@/components/Navbar";
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
  Check,
  ShieldCheck,
  Edit3,
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
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingEmail, setEditingEmail] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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

  const handleRemove = async (id: string) => {
    if (!user) return;
    try {
      const studentDoc = students.find((s) => s.id === id);
      if (!studentDoc) return;
      const batch = writeBatch(db);
      batch.set(doc(db, "orphanedStudents", id), {
        ...studentDoc,
        originalTeacherId: user.uid,
        originalTeacherName: user.name,
        originalClassName: user.className,
        orphanedAt: serverTimestamp(),
        archivedByTeacher: true,
      });
      batch.delete(doc(db, "teachers", user.uid, "students", id));
      await batch.commit();
      setStudents(students.filter((s) => s.id !== id));
      setConfirmDelete(null);
    } catch (err: unknown) {
      setError(getFirestoreError((err as { code?: string }).code ?? ""));
    }
  };

  const handleEditEmail = async () => {
    if (!user || !editingStudent) return;
    setSavingEdit(true);
    try {
      await updateDoc(
        doc(db, "teachers", user.uid, "students", editingStudent.id),
        {
          parentEmail: editingEmail.toLowerCase(),
        },
      );
      setStudents(
        students.map((s) =>
          s.id === editingStudent.id
            ? { ...s, parentEmail: editingEmail.toLowerCase() }
            : s,
        ),
      );
      setEditingStudent(null);
      setEditingEmail("");
    } catch (err: unknown) {
      setError(getFirestoreError((err as { code?: string }).code ?? ""));
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-slate-50 relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-100/30 rounded-full blur-[120px] -z-10" />

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
                  {students.length} active students in your class
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowForm(!showForm)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold transition-all shadow-lg ${showForm ? "bg-slate-200 text-slate-600" : "bg-slate-900 text-white shadow-slate-200 hover:bg-blue-600"}`}
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
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
            <div className="bg-white/40 backdrop-blur-sm rounded-[32px] border border-white p-20 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-slate-300" />
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
              className="grid grid-cols-1 gap-4"
            >
              {students.map((student) => {
                // Compute full name, using name if available, otherwise firstName + lastName
                const fullName =
                  student.name ||
                  `${student.firstName || ""} ${student.lastName || ""}`.trim();
                const initial = fullName
                  ? fullName.charAt(0).toUpperCase()
                  : "?";

                return (
                  <motion.div
                    key={student.id}
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      show: { opacity: 1, y: 0 },
                    }}
                    className="group flex items-center justify-between bg-white rounded-[24px] px-6 py-4 border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                        <span className="text-lg font-bold text-slate-400 group-hover:text-blue-600">
                          {initial}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-lg">
                          {fullName || "Unknown Student"}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-400 font-medium">
                            {student.parentEmail}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <AnimatePresence mode="wait">
                        {editingStudent?.id === student.id ? (
                          <motion.div
                            key="editForm"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="email"
                              value={editingEmail}
                              onChange={(e) => setEditingEmail(e.target.value)}
                              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all w-full sm:w-64"
                              placeholder="Enter new email"
                            />
                            <button
                              onClick={handleEditEmail}
                              disabled={savingEdit}
                              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center gap-2"
                            >
                              {savingEdit ? (
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingStudent(null);
                                setEditingEmail("");
                              }}
                              className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                            >
                              Cancel
                            </button>
                          </motion.div>
                        ) : confirmDelete === student.id ? (
                          <motion.div
                            key="confirm"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="flex gap-2"
                          >
                            <button
                              onClick={() => handleRemove(student.id)}
                              className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
                            >
                              <Check className="w-3 h-3" /> Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="bg-slate-50 text-slate-400 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all"
                            >
                              Cancel
                            </button>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="buttons"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-1"
                          >
                            <button
                              onClick={() => {
                                setEditingStudent(student);
                                setEditingEmail(student.parentEmail);
                              }}
                              className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            >
                              <Edit3 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(student.id)}
                              className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </main>
      </div>
    </PageTransition>
  );
}
