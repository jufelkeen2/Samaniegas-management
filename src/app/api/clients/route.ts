import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, toNumber } from "@/lib/api";
import { readVisitDays } from "@/lib/client-fields";
import { visitDatesForMonth } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  const clients = await prisma.client.findMany({
    where: query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { phone: { contains: query } }, { address: { contains: query, mode: "insensitive" } }] } : undefined,
    include: { payments: { where: { status: "PENDING" }, select: { amount: true } }, _count: { select: { visits: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return NextResponse.json(clients.map(({ payments, ...client }) => ({ ...client, servicePrice: Number(client.servicePrice), pendingBalance: payments.reduce((sum, item) => sum + Number(item.amount), 0) })));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const servicePrice = toNumber(body.servicePrice);
  const paymentDay = toNumber(body.paymentDay);
  const visitDays = readVisitDays(body);
  if (!body.name?.trim() || !body.phone?.trim() || !body.address?.trim()) return badRequest("Nombre, teléfono y dirección son obligatorios.");
  if (!(servicePrice > 0)) return badRequest("El precio mensual debe ser mayor que cero.");
  if (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) return badRequest("El día de pago debe estar entre 1 y 31.");
  if (!visitDays.ok) return badRequest(visitDays.error);
  const dates = visitDatesForMonth(new Date().toISOString().slice(0, 7), visitDays.visitDay1, visitDays.visitDay2);
  const client = await prisma.client.create({ data: { name: body.name.trim(), phone: body.phone.trim(), address: body.address.trim(), notes: body.notes?.trim() ?? "", servicePrice, paymentDay, visitDay1: visitDays.visitDay1, visitDay2: visitDays.visitDay2, active: body.active !== false, visits: { create: dates.map((scheduledDate) => ({ scheduledDate })) } } });
  return NextResponse.json({ ...client, servicePrice: Number(client.servicePrice) }, { status: 201 });
}
