"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { defaultRouteForRole } from "@/lib/auth/permissions";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";

const requiredString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Campo obrigatorio ausente: ${key}`);
  }
  return value.trim();
};

export async function loginAction(formData: FormData) {
  const email = requiredString(formData, "email").toLowerCase();
  const password = requiredString(formData, "password");
  const user = await db.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    redirect("/login?erro=credenciais");
  }

  await setSessionCookie({
    id: user.id,
    name: user.name,
    role: user.role,
  });
  await writeAuditLog({
    userId: user.id,
    entityType: "User",
    entityId: user.id,
    action: "LOGIN",
    afterJson: { email: user.email, role: user.role },
  });
  redirect(defaultRouteForRole(user.role));
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
