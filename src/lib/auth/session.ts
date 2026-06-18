import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role, type Role as RoleValue } from "@/generated/prisma/enums";
import { SESSION_COOKIE } from "@/lib/auth/constants";

export type SessionUser = {
  id: string;
  name: string;
  role: RoleValue;
};

type SessionPayload = {
  user: SessionUser;
  iat: number;
  exp: number;
};

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;

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
  const issuedAt = Date.now();
  const payload: SessionPayload = {
    user,
    iat: issuedAt,
    exp: issuedAt + SESSION_MAX_AGE_MS,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
};

const isValidSessionUser = (value: unknown): value is SessionUser => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const user = value as Partial<SessionUser>;
  return (
    typeof user.id === "string" &&
    typeof user.name === "string" &&
    typeof user.role === "string" &&
    Object.values(Role).includes(user.role as RoleValue)
  );
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
    const now = Date.now();
    if (!Number.isFinite(payload.exp) || payload.exp < now || payload.exp > now + SESSION_MAX_AGE_MS + 60_000) return null;
    if (!isValidSessionUser(payload.user)) return null;
    return {
      id: payload.user.id,
      name: payload.user.name,
      role: payload.user.role,
    };
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
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    priority: "high",
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
