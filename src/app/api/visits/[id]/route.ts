import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, isUniqueViolation } from "@/lib/api";
import { parseDate } from "@/lib/dates";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const scheduledDate = body.scheduledDate ? parseDate(body.scheduledDate) : undefined;
  if (body.scheduledDate && !scheduledDate) return badRequest("La fecha programada no es válida.");
  const completed = body.completed === undefined ? undefined : Boolean(body.completed);
  try {
    const visit = await prisma.visit.update({ where: { id }, data: { ...(body.clientId ? { clientId: body.clientId } : {}), ...(scheduledDate ? { scheduledDate } : {}), ...(completed !== undefined ? { completed, actualDate: completed ? parseDate(body.actualDate) ?? new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z") : null } : {}), ...(body.notes !== undefined ? { notes: body.notes.trim() } : {}) } });
    return NextResponse.json(visit);
  } catch (error) {
    if (isUniqueViolation(error)) return badRequest("Ya existe una visita para este cliente en la fecha elegida.", 409);
    throw error;
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.visit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
