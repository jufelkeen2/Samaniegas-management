import { toNumber } from "@/lib/api";

export function readVisitDays(body: Record<string, unknown>) {
  const visitDay1 = toNumber(body.visitDay1);
  const visitDay2 = toNumber(body.visitDay2);
  if (!Number.isInteger(visitDay1) || visitDay1 < 1 || visitDay1 > 31 || !Number.isInteger(visitDay2) || visitDay2 < 1 || visitDay2 > 31) {
    return { ok: false, error: "Los días de visita deben ser números enteros entre 1 y 31." } as const;
  }
  if (visitDay1 === visitDay2) return { ok: false, error: "Los dos días de visita deben ser distintos." } as const;
  return { ok: true, visitDay1, visitDay2 } as const;
}
