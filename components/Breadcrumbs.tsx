"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function Breadcrumbs() {
  const pathname = usePathname();
  const paths = pathname.split("/").filter(Boolean);

  if (paths.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-xs text-gray-500 mb-6 bg-gray-50/50 w-fit px-3 py-1 rounded-full border border-gray-100">
      {paths.map((path, i) => {
        const href = `/${paths.slice(0, i + 1).join("/")}`;
        const isLast = i === paths.length - 1;
        const label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, " ");

        return (
          <div key={href} className="flex items-center space-x-2">
            {i > 0 && <span>/</span>}
            {isLast ? (
              <span className="font-semibold text-[#1B2B4B]">{label}</span>
            ) : (
              <Link href={href} className="hover:text-[#1B2B4B] transition-colors">
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
