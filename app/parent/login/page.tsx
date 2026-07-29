"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signInWithEmailAndPassword, signOut, getIdToken } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import { getAuthError } from "@/lib/authErrors";
import { getFirestoreError } from "@/lib/firestoreErrors";
import ErrorMessage from "@/components/ErrorMessage";
import AnimatedButton from "@/components/AnimatedButton";
import Modal from "@/components/Modal";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";

// Demo parents data
const DEMO_PARENTS = [
  {
    name: "Babatunde Adebayo",
    email: "babatunde.adebayo@demo.com",
    childCount: "1 child",
    password: "demo1234",
  },
  {
    name: "Oluwaseun Balogun",
    email: "oluwaseun.balogun@demo.com",
    childCount: "2 children",
    password: "demo1234",
  },
  {
    name: "Mubarak Omoregie",
    email: "mubarak.omoregie@demo.com",
    childCount: "5 children",
    password: "demo1234",
  },
];

export default function ParentLogin() {
  usePageTitle("Parent Sign In");
  const { settings } = useSchoolSettings();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleDemoLogin = async (parent: typeof DEMO_PARENTS[0]) => {
    setDemoLoading(parent.email);
    setError(null);
    try {
      // Login as demo parent
      const { user } = await signInWithEmailAndPassword(
        auth,
        parent.email,
        parent.password
      );

      const idToken = await getIdToken(user, true);
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, role: "parent" }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        await signOut(auth);
        setError(errorData.error || "Failed to create session. Please try again.");
        return;
      }

      window.location.href = "/parent/dashboard";
    } catch (err: any) {
      const code = err.code ?? "";
      if (code === "permission-denied" || code === "not-found") {
        setError(getFirestoreError(code));
      } else {
        setError(getAuthError(code));
      }
    } finally {
      setDemoLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      const idToken = await getIdToken(user, true);
      console.log("Parent Login: Got ID token, length:", idToken.length);

      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, role: "parent" }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Parent Login: Session API failed:", errorData);
        await signOut(auth);

        if (res.status === 403) {
          setError(errorData.error || "No parent account found.");
        } else {
          setError(
            `Failed to create session: ${errorData.details || errorData.error || "Please try again."}`
          );
        }
        setLoading(false);
        return;
      }

      console.log("Parent Login: Session created successfully");
      window.location.href = "/parent/dashboard";
    } catch (err: any) {
      const code = err.code ?? "";
      if (code === "permission-denied" || code === "not-found") {
        setError(getFirestoreError(code));
      } else {
        setError(getAuthError(code));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden px-4">
      {/* Decorative background elements */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-100/30 rounded-full blur-3xl opacity-40" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl opacity-40" />

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[480px] z-10"
      >
        <Link
          href="/"
          className="inline-flex items-center text-xs font-bold text-gray-400 hover:text-[#1B2B4B] mb-8 transition-colors uppercase tracking-widest"
        >
          <span className="mr-2">←</span> Back to Portals
        </Link>

        <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/60 p-8 md:p-12 border border-white">
          <div className="mb-10 flex flex-col items-center md:items-start">
            {settings.logo && (
              <img
                src={settings.logo}
                alt="Logo"
                className="w-16 h-16 object-contain mb-6"
              />
            )}
            <h1 className="text-4xl font-extrabold text-[#1B2B4B] tracking-tight text-center md:text-left">
              Parent <span className="text-[#F59E0B]">Sign In</span>
            </h1>
            <p className="text-gray-400 text-sm mt-2 font-medium text-center md:text-left">
              {settings.schoolName} Academic Portal
            </p>
          </div>

          {/* Single Demo login button & Modal */}
          {process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true" && (
            <>
              <AnimatedButton
                onClick={() => setShowDemoModal(true)}
                className="w-full mb-6 bg-gradient-to-r from-[#1B2B4B] to-[#2d3f66] text-white"
              >
                🚀 Quick Demo Login
              </AnimatedButton>

              <Modal
                open={showDemoModal}
                onClose={() => setShowDemoModal(false)}
                title="Select Demo Parent Account"
              >
                <div className="space-y-3 pt-2">
                  {DEMO_PARENTS.map((parent) => (
                    <AnimatedButton
                      key={parent.email}
                      onClick={() => {
                        setShowDemoModal(false);
                        handleDemoLogin(parent);
                      }}
                      loading={demoLoading === parent.email}
                      className="w-full bg-gradient-to-r from-[#1B2B4B] to-[#2d3f66] text-white"
                    >
                      👨‍👩‍👧 Demo: {parent.name}
                    </AnimatedButton>
                  ))}
                </div>
              </Modal>
            </>
          )}

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-400">or continue with</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <ErrorMessage message={error} />
            <div>
              <label className="block text-sm font-medium text-[#1B2B4B] mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B2B4B] mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                placeholder="Your password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="text-right">
              <Link
                href="/parent/forgot-password"
                className="text-xs text-slate-400 hover:text-[#F59E0B] font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <AnimatedButton
              type="submit"
              loading={loading}
              className="w-full py-4 text-base font-bold shadow-lg shadow-[#1B2B4B]/20"
            >
              Sign In
            </AnimatedButton>
          </form>

          <p className="text-center text-sm text-gray-500 mt-8">
            Don&apos;t have an account?{" "}
            <Link
              href="/parent/register"
              className="text-[#1B2B4B] font-bold hover:text-[#F59E0B] transition-colors underline underline-offset-4"
            >
              Register
            </Link>
          </p>
        </div>

        <p className="text-center text-[10px] text-gray-300 mt-8 font-bold uppercase tracking-[0.2em]">
          Secure Parent Access · EduResults
        </p>
      </motion.div>
    </main>
  );
}
