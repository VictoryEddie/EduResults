import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/Toast";
import QueryProvider from "@/components/QueryProvider";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://eduresults-portal.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "EduResults | Student Result Portal",
    template: "%s | EduResults",
  },
  description:
    "Secure and transparent academic result management for students, parents, and teachers. Access term reports, track academic progress, and manage your school portal.",
  keywords: [
    "student portal",
    "academic results",
    "education management",
    "school reports",
    "term results",
    "Nigeria school portal",
    "parent portal",
    "teacher portal",
    "result management system",
  ],
  authors: [{ name: "EduResults Team" }],
  creator: "EduResults",
  publisher: "EduResults",
  category: "education",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "EduResults | Student Result Portal",
    description:
      "Secure and transparent academic result management for students, parents, and teachers.",
    url: baseUrl,
    type: "website",
    locale: "en_US",
    siteName: "EduResults",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "EduResults - Student Result Portal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EduResults | Student Result Portal",
    description:
      "Access academic records safely and securely. Manage term results, student records, and school reports.",
    images: ["/og-image.png"],
  },
};

// Schema.org JSON-LD structured data for Google Rich Results
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "EduResults",
  description:
    "A secure, transparent academic result portal for schools, teachers, and parents to manage student records and term reports.",
  applicationCategory: "EducationApplication",
  operatingSystem: "Any",
  url: baseUrl,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  provider: {
    "@type": "Organization",
    name: "EduResults",
    url: baseUrl,
  },
  featureList: [
    "Academic result management",
    "Term report generation",
    "Parent portal",
    "Teacher portal",
    "Admin dashboard",
    "Student progress tracking",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Schema.org JSON-LD for Google Rich Results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#1B2B4B" />
        <meta name="color-scheme" content="light" />
      </head>
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
