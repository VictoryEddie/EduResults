"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { motion } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import { getAuthError } from "@/lib/authErrors";
import ErrorMessage from "@/components/ErrorMessage";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";

export default function ParentRegister() {
  usePageTitle("Parent Registration");
  const { settings } = useSchoolSettings();
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Check via server-side API if email is linked to any student
      const checkRes = await fetch("/api/check-parent-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const checkData = await checkRes.json();
      if (!checkRes.ok) {
        setError(checkData.error);
        setLoading(false);
        return;
      }

      // Step 2: Create Firebase Auth account
      const { user } = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password,
      );

      const idToken = await user.getIdToken();

      // Step 3: Save parent profile to Firestore via server-side API (more reliable)
      const profileRes = await fetch("/api/create-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          role: "parent",
          profileData: {
            name: `${form.firstName} ${form.lastName}`,
            email: form.email.toLowerCase(),
          },
        }),
      });

      if (!profileRes.ok) {
        const data = await profileRes.json();
        throw new Error(data.error || "Failed to create profile");
      }

      // Create server-side session cookie
      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, role: "parent" }),
      });
      router.push("/parent/login");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(getAuthError(code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden py-12 px-4">
      {/* Decorative background elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-40" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#F59E0B]/10 rounded-full blur-3xl opacity-40" />

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[540px] z-10"
      >
        <Link
          href="/"
          className="inline-flex items-center text-xs font-bold text-gray-400 hover:text-[#1B2B4B] mb-8 transition-colors uppercase tracking-widest"
        >
          <span className="mr-2">←</span> Back to Portals
        </Link>

        <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/60 p-8 md:p-12 border border-slate-100">
          <div className="mb-10">
            {settings.logo && (
              <img
                src={settings.logo}
                alt="Logo"
                className="w-16 h-16 object-contain mb-6"
              />
            )}
            <h1 className="text-4xl font-extrabold text-[#1B2B4B] tracking-tight">
              Parent <span className="text-[#F59E0B]">Portal</span>
            </h1>
            <p className="text-gray-400 text-sm mt-2 font-medium">
              {settings.schoolName} Academic Portal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <ErrorMessage message={error} />

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-xl">💡</span>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                Please use the{" "}
                <span className="font-bold text-[#1B2B4B]">email address</span>{" "}
                your child&apos;s teacher requested from you to ensure your
                accounts are linked correctly.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1B2B4B] mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  placeholder="First name"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B]/10 focus:border-[#1B2B4B] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1B2B4B] mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B]/10 focus:border-[#1B2B4B] transition-all"
                />
              </div>
            </div>

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
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B]/10 focus:border-[#1B2B4B] transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1B2B4B] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="Min 8 chars"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B]/10 focus:border-[#1B2B4B] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1B2B4B] mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirm"
                  placeholder="Repeat password"
                  value={form.confirm}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B]/10 focus:border-[#1B2B4B] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1B2B4B] text-white py-4 rounded-xl text-base font-bold hover:bg-[#F59E0B] hover:text-[#1B2B4B] transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#1B2B4B]/20"
            >
              {loading ? "Registering Account..." : "Create Parent Account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-8">
            Already have an account?{" "}
            <Link
              href="/parent/login"
              className="text-[#1B2B4B] font-bold hover:text-[#F59E0B] transition-colors underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-[10px] text-gray-300 mt-8 font-bold uppercase tracking-[0.2em]">
          Supporting Excellence · {settings.schoolName}
        </p>
      </motion.div>
    </main>
  );
}
