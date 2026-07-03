import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/verifySession";

export default async function ProtectedParentLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("parent-token")?.value;

  if (!token) {
    redirect("/parent/login");
  }

  const session = await verifySession(token);
  
  if (!session) {
    redirect("/parent/login");
  }

  // Optional: check session properties if there is a role or something
  // if (session.role !== "parent") { ... }

  return <>{children}</>;
}
