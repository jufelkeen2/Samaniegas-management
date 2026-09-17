import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/dates";

export function resolvedVisitDays(year: number, monthNumber: number, visitDay1: number, visitDay2: number) {
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const [earlierChoice, laterChoice] = [visitDay1, visitDay2].sort((a, b) => a - b);
  const laterDay = Math.min(laterChoice, daysInMonth);
  const earlierDay = Math.min(earlierChoice, laterDay - 1);
  return [earlierDay, laterDay];
}

export function visitDatesForMonth(month: string, visitDay1: number, visitDay2: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  return resolvedVisitDays(year, monthNumber, visitDay1, visitDay2).map((day) => new Date(Date.UTC(year, monthNumber - 1, day)));
}

export async function ensureMonthlyVisits(month?: string) {
  const range = monthRange(month);
  const [clients, existingVisits] = await Promise.all([
    prisma.client.findMany({ where: { active: true }, select: { id: true, visitDay1: true, visitDay2: true } }),
    prisma.visit.findMany({ where: { scheduledDate: { gte: range.start, lt: range.end } }, select: { clientId: true, scheduledDate: true } }),
  ]);
  const existing = new Set(existingVisits.map((visit) => `${visit.clientId}:${visit.scheduledDate.toISOString().slice(0, 10)}`));
  const creates = clients.flatMap((client) => visitDatesForMonth(range.month, client.visitDay1, client.visitDay2)
    .filter((scheduledDate) => !existing.has(`${client.id}:${scheduledDate.toISOString().slice(0, 10)}`))
    .map((scheduledDate) => ({ clientId: client.id, scheduledDate })));
  if (creates.length) await prisma.visit.createMany({ data: creates, skipDuplicates: true });
  return range;
}
