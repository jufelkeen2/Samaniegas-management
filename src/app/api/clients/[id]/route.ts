import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, toNumber } from "@/lib/api";
import { readVisitDays } from "@/lib/client-fields";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const servicePrice = toNumber(body.servicePrice);
  const paymentDay = toNumber(body.paymentDay);
  const visitDays = readVisitDays(body);
  if (!body.name?.trim() || !body.phone?.trim() || !body.address?.trim()) return badRequest("Nombre, teléfono y dirección son obligatorios.");
  if (!(servicePrice > 0) || !Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) return badRequest("Revisa el precio mensual y el día de pago.");
  if (!visitDays.ok) return badRequest(visitDays.error);
  const client = await prisma.client.update({ where: { id }, data: { name: body.name.trim(), phone: body.phone.trim(), address: body.address.trim(), notes: body.notes?.trim() ?? "", servicePrice, paymentDay, visitDay1: visitDays.visitDay1, visitDay2: visitDays.visitDay2, active: body.active !== false } });
  return NextResponse.json({ ...client, servicePrice: Number(client.servicePrice) });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
