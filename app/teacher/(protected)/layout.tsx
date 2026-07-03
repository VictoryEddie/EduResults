import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/verifySession";

export default async function ProtectedTeacherLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("teacher-token")?.value;

  if (!token) {
    redirect("/teacher/login");
  }

  const session = await verifySession(token);
  
  if (!session) {
    redirect("/teacher/login");
  }

  // Optional: check session properties if there is a role or something
  // if (session.role !== "teacher") { ... }

  return <>{children}</>;
}
