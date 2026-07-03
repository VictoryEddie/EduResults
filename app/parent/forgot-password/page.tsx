"use client";
import Link from "next/link";
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebase";
import { getAuthError } from "@/lib/authErrors";
import ErrorMessage from "@/components/ErrorMessage";
import AnimatedButton from "@/components/AnimatedButton";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function ParentForgotPassword() {
  usePageTitle("Reset Password");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(getAuthError(code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#1B2B4B]">EduResults</h1>
          <p className="text-gray-500 text-sm mt-1">Reset your password</p>
        </div>

        {sent ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="border border-gray-200 rounded-xl p-8 text-center space-y-4">
            <div className="text-4xl">📧</div>
            <p className="text-[#1B2B4B] font-medium">Reset link sent!</p>
            <p className="text-sm text-gray-500">Check your email for instructions to reset your password.</p>
            <Link href="/parent/login" className="block text-sm text-[#1B2B4B] font-medium hover:text-[#F59E0B]">Back to Sign In</Link>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="border border-gray-200 rounded-xl p-8 space-y-5">
            <ErrorMessage message={error} />
            <div>
              <label className="block text-sm font-medium text-[#1B2B4B] mb-1">Email</label>
              <input type="email" placeholder="your@email.com" value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }} required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B2B4B]" />
            </div>
            <AnimatedButton type="submit" loading={loading} className="w-full">Send Reset Link</AnimatedButton>
            <p className="text-center text-sm text-gray-500">
              <Link href="/parent/login" className="text-[#1B2B4B] hover:text-[#F59E0B]">Back to Sign In</Link>
            </p>
          </form>
        )}
      </motion.div>
    </main>
  );
}
