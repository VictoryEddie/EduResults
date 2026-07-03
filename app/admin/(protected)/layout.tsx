import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/verifyAdminSession";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin-token")?.value;

  if (!token) {
    redirect("/admin/login");
  }

  const session = await verifyAdminSession(token);
  
  if (!session) {
    redirect("/admin/login");
  }

  return <>{children}</>;
}
