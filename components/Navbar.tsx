"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { motion } from "framer-motion";
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

  /* Only activate session timeout when a user is actually logged in */
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

  return (
    <nav className="bg-[#1B2B4B] text-white px-6 py-4 flex items-center justify-between shadow-sm">
      <Link
        href={dashboardLink}
        className="flex items-center gap-3 hover:text-[#F59E0B] transition-colors group"
      >
        {settings.logo && (
          <img
            src={settings.logo}
            alt="Logo"
            className="w-8 h-8 object-contain"
          />
        )}
        <span className="text-xl font-bold tracking-tight">
          {settings.schoolName}
        </span>
      </Link>
      <div className="flex items-center gap-6 text-sm">
        {role === "teacher" && (
          <>
            <NavLink href="/teacher/dashboard">Dashboard</NavLink>
            <NavLink href="/teacher/students">Students</NavLink>
            <NavLink href="/teacher/results">Results</NavLink>
          </>
        )}
        {role === "parent" && (
          <NavLink href="/parent/dashboard">My Children</NavLink>
        )}
        {role === "admin" && (
          <>
            <NavLink href="/admin/dashboard">Dashboard</NavLink>
            <NavLink href="/admin/teachers">Teachers</NavLink>
            <NavLink href="/admin/parents">Parents</NavLink>
            <NavLink href="/admin/orphaned">Orphaned</NavLink>
          </>
        )}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleLogout}
          className="border border-white px-3 py-1 rounded hover:bg-white hover:text-[#1B2B4B] transition-colors"
        >
          Logout
        </motion.button>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`${isActive ? "text-[#F59E0B]" : "text-white"} hover:text-[#F59E0B] transition-colors relative group font-medium text-xs uppercase tracking-wider`}
    >
      {children}
      <span
        className={`absolute -bottom-1 left-0 h-0.5 bg-[#F59E0B] transition-all ${isActive ? "w-full" : "w-0 group-hover:w-full"}`}
      />
    </Link>
  );
}
