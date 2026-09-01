"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import ErrorMessage from "@/components/ErrorMessage";
import AnimatedButton from "@/components/AnimatedButton";
import { usePageTitle } from "@/hooks/usePageTitle";
import Breadcrumbs from "@/components/Breadcrumbs";
import DemoLockModal from "@/components/DemoLockModal";
import { useDemoLock } from "@/hooks/useDemoLock";
import {
  Settings,
  School,
  MapPin,
  Quote,
  Image as ImageIcon,
  Save,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export default function AdminSettings() {
  usePageTitle("School Settings");
  const { isDemoUser, lockedActionTitle, guardDemoAction, closeDemoLock } = useDemoLock();

  const [form, setForm] = useState({
    schoolName: "",
    location: "",
    motto: "",
    logo: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) setForm(data.settings);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load settings.");
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardDemoAction("Update School Settings")) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: form }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save settings.");
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">
          Loading Settings...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-amber-100/30 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-purple-100/30 rounded-full blur-[120px] -z-10" />

      <Navbar role="admin" />

      <main className="max-w-2xl mx-auto px-6 py-12 relative z-10">
        <Breadcrumbs />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex items-center gap-4"
        >
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              School Profile
            </h2>
            <p className="text-slate-500 font-medium">
              Customize your institution&apos;s identity
            </p>
          </div>
        </motion.div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/80 backdrop-blur-md rounded-[32px] p-10 border border-white shadow-2xl shadow-slate-200/40 space-y-8"
        >
          <ErrorMessage message={error} />

          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3 text-emerald-600 font-bold text-sm"
              >
                <CheckCircle2 className="w-5 h-5" />
                Settings updated successfully!
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-6">
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-black text-slate-700 mb-3 ml-1 uppercase tracking-widest text-[10px]">
                <School className="w-3.5 h-3.5 text-blue-600" /> Institution
                Name
              </label>
              <input
                type="text"
                value={form.schoolName}
                onChange={(e) =>
                  setForm({ ...form, schoolName: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-inner"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-black text-slate-700 mb-3 ml-1 uppercase tracking-widest text-[10px]">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Physical
                Address
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-black text-slate-700 mb-3 ml-1 uppercase tracking-widest text-[10px]">
                <Quote className="w-3.5 h-3.5 text-blue-600" /> Official Motto
              </label>
              <input
                type="text"
                value={form.motto}
                onChange={(e) => setForm({ ...form, motto: e.target.value })}
                placeholder="e.g. Knowledge is Power"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold italic focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-black text-slate-700 mb-3 ml-1 uppercase tracking-widest text-[10px]">
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> Logo Asset
                URL
              </label>
              <input
                type="text"
                value={form.logo}
                onChange={(e) => setForm({ ...form, logo: e.target.value })}
                placeholder="https://your-domain.com/logo.png"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-inner"
              />
              <p className="text-[10px] text-slate-400 mt-2 ml-1 font-medium">
                Pro-tip: Use a transparent PNG for the best appearance on result
                sheets.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saving ? "Saving Changes..." : "Apply Profile Updates"}
          </button>
        </form>
      </main>

      <DemoLockModal
        open={Boolean(lockedActionTitle)}
        onClose={closeDemoLock}
        actionTitle={lockedActionTitle ?? undefined}
      />
    </div>
  );
}
