import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-[#1B2B4B] mb-3">404</h1>
        <p className="text-gray-500 text-sm mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="bg-[#1B2B4B] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#F59E0B] hover:text-[#1B2B4B] transition-colors"
        >
          Go Home
        </Link>
      </div>
    </main>
  );
}
