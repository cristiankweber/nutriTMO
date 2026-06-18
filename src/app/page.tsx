import { redirect } from "next/navigation";
import { defaultRouteForRole } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";

export default async function Home() {
  const user = await getSessionUser();
  redirect(user ? defaultRouteForRole(user.role) : "/login");
}
