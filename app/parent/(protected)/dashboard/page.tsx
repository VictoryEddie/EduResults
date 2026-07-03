"use client";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SkeletonTable } from "@/components/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import Breadcrumbs from "@/components/Breadcrumbs";
import Modal from "@/components/Modal";
import AnimatedButton from "@/components/AnimatedButton";
import ErrorMessage from "@/components/ErrorMessage";
import { User, GraduationCap, ArrowRight, ShieldAlert, BookOpen } from "lucide-react";

interface Child { 
  id: string; 
  name: string; 
  className: string; 
  teacherName: string; 
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ 
    opacity: 1, 
    y: 0, 
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" } 
  }),
};

export default function ParentDashboard() {
  usePageTitle("Parent Dashboard");
  const { user, loading: authLoading } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = async () => {
    try {
      const res = await fetch("/api/get-children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setChildren(data.children);
    } catch {
      setError("Failed to load children. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.email) return;
    fetchChildren();
  }, [user]);


  if (authLoading || loading) return (
    <div className="min-h-screen bg-slate-50">
      <Navbar role="parent" />
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-lg w-1/3" />
          <div className="h-4 bg-slate-200 rounded-lg w-1/4" />
        </div>
        <div className="mt-12"><SkeletonTable rows={3} /></div>
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-100/30 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-purple-100/30 rounded-full blur-[120px] -z-10" />

      <Navbar role="parent" />
      
      <main className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        <Breadcrumbs />
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              Welcome, <span className="text-blue-600 capitalize">{user?.name?.split(' ')[0]}</span>
            </h2>
            <p className="text-slate-500 font-medium mt-2">
              Monitor your children&apos;s academic excellence.
            </p>
          </div>
        </motion.div>

        <ErrorMessage message={error} />

        <AnimatePresence mode="wait">
          {children.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/60 backdrop-blur-md rounded-[32px] border border-white p-12 text-center shadow-xl shadow-slate-200/50"
            >
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No children linked</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-4 leading-relaxed font-medium">
                Your children haven&apos;t been connected to your profile yet.
              </p>
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 max-w-xs mx-auto">
                <p className="text-xs text-blue-800 font-bold leading-relaxed">
                  Please contact the school administration or your child&apos;s teacher to link their academic profile.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="list"
              initial="hidden" 
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {children.map((child, i) => (
                <motion.div 
                  key={child.id}
                  custom={i}
                  variants={cardVariants}
                >
                  <Link 
                    href={`/parent/results?studentId=${child.id}&class=${encodeURIComponent(child.className)}&name=${encodeURIComponent(child.name)}`}
                    className="group flex items-center gap-5 bg-white rounded-[24px] p-6 border border-slate-100 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="w-5 h-5 text-blue-500" />
                    </div>
                    
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                      <GraduationCap className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors capitalize">
                        {child.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded-md">
                          {child.className}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {child.teacherName}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

    </div>
  );
}
