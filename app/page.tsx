"use client";

import { motion, easeOut } from "framer-motion";
import Link from "next/link";
import { UserCog, BookOpen, Users } from "lucide-react";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";

export default function Home() {
  const { settings } = useSchoolSettings();
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 } as any,
    },
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-amber-100/30 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-100/30 blur-[100px] pointer-events-none" />

      <div className="max-w-4xl w-full z-10 relative">
        <div className="text-center mb-16">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold tracking-wide shadow-sm border border-blue-200"
          >
            {settings.logo && (
              <img
                src={settings.logo}
                alt="Logo"
                className="w-5 h-5 object-contain"
              />
            )}
            {settings.schoolName} Portal
          </motion.div>
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6"
          >
            Welcome to the{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Academic Portal
            </span>
          </motion.h1>
          <motion.p
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium"
          >
            {settings.motto ||
              "Access academic records safely and securely. Please select your role to proceed to the login gateway."}
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
        >
          {/* Admin Card */}
          <Link href="/admin/login" className="group">
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 hover:border-blue-200 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300">
                <UserCog className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                Admin Login
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                System configuration, user management, and global results
                overview.
              </p>
            </motion.div>
          </Link>

          {/* Teacher Card */}
          <Link href="/teacher/login" className="group">
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 hover:border-emerald-200 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 transition-colors duration-300">
                <BookOpen className="w-8 h-8 text-emerald-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                Teacher Login
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Manage your classes, input student results, and generate
                reports.
              </p>
            </motion.div>
          </Link>

          {/* Parent Card */}
          <Link href="/parent/login" className="group">
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 hover:border-purple-200 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors duration-300">
                <Users className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                Parent Login
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                View your child's academic progress, attendance, and exam
                results.
              </p>
            </motion.div>
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
