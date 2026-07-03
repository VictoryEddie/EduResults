"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ErrorMessage from "@/components/ErrorMessage";
import AnimatedButton from "@/components/AnimatedButton";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";

// Demo admin credentials
const DEMO_ADMIN_EMAIL = "demo.admin@eduresults.com";
const DEMO_ADMIN_PASSWORD = "demo1234";

export default function AdminLoginPage() {
  usePageTitle("Admin Portal");
  const { settings } = useSchoolSettings();
  const router = useRouter();

  /* Toggle between "register" and "login" modes — starts on login */
  const [mode, setMode] = useState<"register" | "login">("login"); // Default to login for demo

  const [form, setForm] = useState({
    name: "",
    email: "",
    accessKey: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  /* Registration — validates access key against Firestore, creates admin account */
  const handleRegister = async (e: React.FormEvent) => {
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
      const res = await fetch("/api/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          accessKey: form.accessKey,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      /* Registration successful — switch to login */
      setSuccess("Account created successfully. You can now log in.");
      setMode("login");
      setForm({
        name: "",
        email: form.email,
        accessKey: "",
        password: "",
        confirm: "",
      });
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  /* Login — verifies credentials and creates a server-side session cookie */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      router.push("/admin/dashboard");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Quick demo login
  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setError(null);
    try {
      // Login directly as demo admin (accounts already created)
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: DEMO_ADMIN_EMAIL,
          password: DEMO_ADMIN_PASSWORD,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      router.push("/admin/dashboard");
    } catch {
      setError("Failed to log in. Please try again.");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-40" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#F59E0B]/10 rounded-full blur-3xl opacity-40" />

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[480px] z-10 px-4"
      >
        <Link
          href="/"
          className="inline-flex items-center text-xs font-bold text-gray-400 hover:text-[#1B2B4B] mb-8 transition-colors uppercase tracking-widest"
        >
          <span className="mr-2">←</span> Back to Portals
        </Link>

        <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/60 p-8 md:p-12 border border-slate-100">
          {/* Header */}
          <div className="mb-10 flex flex-col items-center md:items-start">
            {settings.logo && (
              <img
                src={settings.logo}
                alt="Logo"
                className="w-16 h-16 object-contain mb-6"
              />
            )}
            <h1 className="text-4xl font-extrabold text-[#1B2B4B] tracking-tight text-center md:text-left">
              Admin{" "}
              <span className="text-[#F59E0B]">
                {mode === "register" ? "Register" : "Login"}
              </span>
            </h1>
            <p className="text-gray-400 text-sm mt-2 font-medium text-center md:text-left">
              {settings.schoolName} Portal Management
            </p>
          </div>

          {/* Demo login button */}
          <AnimatedButton
            onClick={handleDemoLogin}
            loading={demoLoading}
            className="w-full mb-6 bg-gradient-to-r from-[#1B2B4B] to-[#2d3f66] text-white"
          >
            🚀 Quick Demo Login
          </AnimatedButton>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-400">
                or continue with
              </span>
            </div>
          </div>

          {/* Mode toggle buttons */}
          <div className="flex rounded-xl border border-gray-200 p-1 mb-6">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setMode("register");
                setError(null);
                setSuccess("");
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "register"
                  ? "bg-[#1B2B4B] text-white"
                  : "text-gray-500 hover:text-[#1B2B4B]"
              }`}
            >
              Register
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setMode("login");
                setError(null);
                setSuccess("");
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "login"
                  ? "bg-[#1B2B4B] text-white"
                  : "text-gray-500 hover:text-[#1B2B4B]"
              }`}
            >
              Login
            </motion.button>
          </div>

          {/* Success message after registration */}
          {success && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4"
            >
              {success}
            </motion.p>
          )}

          {/* Animated form swap between register and login */}
          <AnimatePresence mode="wait">
            {mode === "register" ? (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleRegister}
                className="space-y-5"
              >
                <ErrorMessage message={error} />

                <div>
                  <label className="block text-sm font-medium text-[#1B2B4B] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Your full name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B2B4B]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1B2B4B] mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B2B4B]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1B2B4B] mb-1">
                    Access Key
                  </label>
                  <input
                    type="password"
                    name="accessKey"
                    placeholder="Provided access key"
                    value={form.accessKey}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B2B4B]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1B2B4B] mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    placeholder="At least 8 characters"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B2B4B]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1B2B4B] mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirm"
                    placeholder="Repeat your password"
                    value={form.confirm}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B2B4B]"
                  />
                </div>

                <AnimatedButton
                  type="submit"
                  loading={loading}
                  className="w-full"
                >
                  Create Admin Account
                </AnimatedButton>
              </motion.form>
            ) : (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLogin}
                className="space-y-5"
              >
                <ErrorMessage message={error} />

                <div>
                  <label className="block text-sm font-medium text-[#1B2B4B] mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B2B4B]"
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
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B2B4B]"
                  />
                </div>

                <AnimatedButton
                  type="submit"
                  loading={loading}
                  className="w-full"
                >
                  Sign In
                </AnimatedButton>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="text-center text-[10px] text-gray-300 mt-8 font-bold uppercase tracking-[0.2em]">
            Secure · Authorised Access Only
          </p>
        </div>
      </motion.div>
    </main>
  );
}
