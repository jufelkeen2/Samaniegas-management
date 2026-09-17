import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, isUniqueViolation } from "@/lib/api";
import { parseDate } from "@/lib/dates";
import { ensureMonthlyVisits } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month") ?? undefined;
  const status = request.nextUrl.searchParams.get("status") ?? "ALL";
  const clientId = request.nextUrl.searchParams.get("clientId")?.trim() ?? "";
  const range = await ensureMonthlyVisits(month);
  const visits = await prisma.visit.findMany({
    where: { scheduledDate: { gte: range.start, lt: range.end }, ...(clientId ? { clientId } : {}), ...(status === "COMPLETED" ? { completed: true } : status === "PENDING" ? { completed: false } : {}) },
    include: { client: { select: { id: true, name: true, address: true, phone: true, servicePrice: true } } },
    orderBy: [{ scheduledDate: "asc" }, { client: { name: "asc" } }],
  });
  return NextResponse.json(visits.map((visit) => ({ ...visit, scheduledDate: visit.scheduledDate.toISOString().slice(0, 10), actualDate: visit.actualDate?.toISOString().slice(0, 10) ?? null, client: { ...visit.client, servicePrice: Number(visit.client.servicePrice) } })));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const scheduledDate = parseDate(body.scheduledDate);
  if (!body.clientId || !scheduledDate) return badRequest("Selecciona un cliente y una fecha.");
  try {
    const visit = await prisma.visit.create({ data: { clientId: body.clientId, scheduledDate, completed: Boolean(body.completed), actualDate: body.completed ? parseDate(body.actualDate) ?? scheduledDate : null, notes: body.notes?.trim() ?? "" } });
    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) return badRequest("Ya existe una visita para este cliente en la fecha elegida.", 409);
    throw error;
  }
}
