import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduResults",
  description: "Student Result Portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-[#1B2B4B]">
        {children}
      </body>
    </html>
  );
}
