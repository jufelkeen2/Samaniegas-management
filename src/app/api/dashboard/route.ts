import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureMonthlyVisits } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const range = await ensureMonthlyVisits(request.nextUrl.searchParams.get("month") ?? undefined);
  const paymentWhere = { dueDate: { gte: range.start, lt: range.end } };
  const [activeClients, pendingServices, completedServices, paid, pending, upcoming, pendingPayments] = await Promise.all([
    prisma.client.count({ where: { active: true } }),
    prisma.visit.count({ where: { scheduledDate: { gte: range.start, lt: range.end }, completed: false } }),
    prisma.visit.count({ where: { scheduledDate: { gte: range.start, lt: range.end }, completed: true } }),
    prisma.payment.aggregate({ where: { ...paymentWhere, status: "PAID" }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { ...paymentWhere, status: "PENDING" }, _sum: { amount: true } }),
    prisma.visit.findMany({ where: { scheduledDate: { gte: new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z"), lt: range.end }, completed: false }, include: { client: { select: { name: true, address: true } } }, orderBy: { scheduledDate: "asc" }, take: 5 }),
    prisma.payment.findMany({ where: { ...paymentWhere, status: "PENDING" }, include: { client: { select: { name: true } } }, orderBy: { dueDate: "asc" }, take: 5 }),
  ]);
  return NextResponse.json({ month: range.month, metrics: { activeClients, pendingServices, completedServices, paid: Number(paid._sum.amount ?? 0), pending: Number(pending._sum.amount ?? 0) }, upcoming: upcoming.map((item) => ({ ...item, scheduledDate: item.scheduledDate.toISOString().slice(0, 10) })), pendingPayments: pendingPayments.map((item) => ({ ...item, amount: Number(item.amount), dueDate: item.dueDate.toISOString().slice(0, 10) })) });
}
