import { NextResponse } from "next/server";

export function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

export function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
