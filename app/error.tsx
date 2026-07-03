"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-[#1B2B4B] mb-3">Something went wrong</h1>
        <p className="text-gray-500 text-sm mb-8">
          An unexpected error occurred. Please try again or return to the home page.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="bg-[#1B2B4B] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#F59E0B] hover:text-[#1B2B4B] transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="border border-[#1B2B4B] text-[#1B2B4B] px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1B2B4B] hover:text-white transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
