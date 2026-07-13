"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useAuth } from "@/context/AuthContext";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";

interface NavbarProps {
  role: "teacher" | "parent" | "admin";
}

export default function Navbar({ role }: NavbarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useSchoolSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useSessionTimeout(!!user);

  const handleLogout = async () => {
    await signOut(auth);
    await fetch("/api/session", { method: "DELETE" });
    router.push("/");
  };

  const dashboardLink =
    role === "teacher" ? "/teacher/dashboard" :
    role === "parent" ? "/parent/dashboard" :
    "/admin/dashboard";

  const teacherLinks = [
    { href: "/teacher/dashboard", label: "Dashboard" },
    { href: "/teacher/students", label: "Students" },
    { href: "/teacher/results", label: "Results" },
    { href: "/teacher/preview", label: "Preview" },
    { href: "/teacher/print", label: "Print" },
  ];
  const parentLinks = [{ href: "/parent/dashboard", label: "My Children" }];
  const adminLinks = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/teachers", label: "Teachers" },
    { href: "/admin/parents", label: "Parents" },
    { href: "/admin/orphaned", label: "Orphaned" },
    { href: "/admin/settings", label: "Settings" },
  ];

  const links =
    role === "teacher" ? teacherLinks :
    role === "parent" ? parentLinks :
    adminLinks;

  return (
    <nav className="bg-[#1B2B4B] text-white shadow-sm relative z-50">
      <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo / School Name */}
        <Link
          href={dashboardLink}
          className="flex items-center gap-3 hover:text-[#F59E0B] transition-colors group"
        >
          {settings.logo && (
            <img src={settings.logo} alt="Logo" className="w-8 h-8 object-contain" />
          )}
          <span className="text-lg sm:text-xl font-bold tracking-tight truncate max-w-[160px] sm:max-w-none">
            {settings.schoolName}
          </span>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          {links.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleLogout}
            className="border border-white/60 px-3 py-1.5 rounded-lg hover:bg-white hover:text-[#1B2B4B] transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </motion.button>
        </div>

        {/* Mobile hamburger button */}
        <button
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          <AnimatePresence mode="wait" initial={false}>
            {mobileMenuOpen ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="w-5 h-5" />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Menu className="w-5 h-5" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Mobile slide-down menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden md:hidden border-t border-white/10"
          >
            <div className="flex flex-col px-4 py-3 gap-1">
              {links.map((link) => (
                <MobileNavLink
                  key={link.href}
                  href={link.href}
                  onNavigate={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </MobileNavLink>
              ))}
              <button
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-300 hover:text-red-200 hover:bg-white/5 rounded-xl transition-colors mt-2 border-t border-white/10 pt-4"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={`${isActive ? "text-[#F59E0B]" : "text-white"} hover:text-[#F59E0B] transition-colors relative group font-medium text-xs uppercase tracking-wider`}
    >
      {children}
      <span className={`absolute -bottom-1 left-0 h-0.5 bg-[#F59E0B] transition-all ${isActive ? "w-full" : "w-0 group-hover:w-full"}`} />
    </Link>
  );
}

function MobileNavLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${
        isActive
          ? "bg-[#F59E0B]/20 text-[#F59E0B]"
          : "text-white/80 hover:text-white hover:bg-white/10"
      }`}
    >
      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] mr-3 flex-shrink-0" />}
      {children}
    </Link>
  );
}
