import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { SESSION_COOKIE } from "@/lib/auth/constants";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type SessionPayload = {
  user: SessionUser;
  exp: number;
};

const getSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error("SESSION_SECRET deve ter pelo menos 24 caracteres.");
  }
  return secret;
};

const encodeBase64Url = (value: string) => Buffer.from(value, "utf8").toString("base64url");

const sign = (payload: string) =>
  crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");

export const createSessionToken = (user: SessionUser) => {
  const payload: SessionPayload = {
    user,
    exp: Date.now() + 1000 * 60 * 60 * 12,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
};

export const verifySessionToken = (token?: string): SessionUser | null => {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload.user;
  } catch {
    return null;
  }
};

export const getSessionUser = async () => {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
};

export const setSessionCookie = async (user: SessionUser) => {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
};

export const clearSessionCookie = async () => {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
};

export const requireUser = async () => {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
};
