import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await prisma.businessSettings.upsert({ where: { id: "main" }, update: {}, create: { id: "main" } }));
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  if (!body.businessName?.trim()) return badRequest("El nombre del negocio es obligatorio.");
  const settings = await prisma.businessSettings.upsert({ where: { id: "main" }, create: { id: "main", businessName: body.businessName.trim(), ownerName: body.ownerName?.trim() ?? "", phone: body.phone?.trim() ?? "", email: body.email?.trim() ?? "", address: body.address?.trim() ?? "", defaultVisitsPerMonth: 2 }, update: { businessName: body.businessName.trim(), ownerName: body.ownerName?.trim() ?? "", phone: body.phone?.trim() ?? "", email: body.email?.trim() ?? "", address: body.address?.trim() ?? "", defaultVisitsPerMonth: 2 } });
  return NextResponse.json(settings);
}
