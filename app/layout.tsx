import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/Toast";
import QueryProvider from "@/components/QueryProvider";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "EduResults | Student Result Portal",
    template: "%s | EduResults"
  },
  description: "Secure and transparent academic result management for students, parents, and teachers.",
  keywords: ["student portal", "academic results", "education management", "school reports"],
  authors: [{ name: "EduResults Team" }],
  openGraph: {
    title: "EduResults | Student Result Portal",
    description: "Access academic records safely and securely.",
    type: "website",
    locale: "en_US",
    siteName: "EduResults",
  },
  twitter: {
    card: "summary_large_image",
    title: "EduResults | Student Result Portal",
    description: "Access academic records safely and securely.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 text-[#1B2B4B] font-sans">
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

