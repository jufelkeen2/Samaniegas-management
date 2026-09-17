import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function date(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day));
}

async function main() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  await prisma.payment.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.client.deleteMany();
  await prisma.businessSettings.upsert({
    where: { id: "main" },
    update: { businessName: "Verde Claro Landscaping", ownerName: "Alex Rivera", phone: "(555) 010-2040", email: "hola@verdeclaro.example", address: "1250 Garden Ave, Orlando, FL", defaultVisitsPerMonth: 2 },
    create: { id: "main", businessName: "Verde Claro Landscaping", ownerName: "Alex Rivera", phone: "(555) 010-2040", email: "hola@verdeclaro.example", address: "1250 Garden Ave, Orlando, FL", defaultVisitsPerMonth: 2 },
  });

  const examples = [
    { name: "Ana Martínez (Ejemplo)", phone: "(555) 014-1280", address: "742 Palm Street, Orlando, FL", notes: "Prefiere servicio por la mañana. Portón lateral.", servicePrice: 170, paymentDay: 15, visitDay1: 1, visitDay2: 15 },
    { name: "Carlos Vega (Ejemplo)", phone: "(555) 018-4472", address: "118 Lakeview Drive, Winter Park, FL", notes: "Incluir recorte de setos cada segunda visita.", servicePrice: 220, paymentDay: 20, visitDay1: 3, visitDay2: 17 },
    { name: "Lucía Torres (Ejemplo)", phone: "(555) 013-9061", address: "905 Magnolia Lane, Orlando, FL", notes: "Avisar por mensaje antes de llegar.", servicePrice: 150, paymentDay: 10, visitDay1: 4, visitDay2: 18 },
    { name: "Roberto Díaz (Ejemplo)", phone: "(555) 016-3328", address: "311 Cypress Court, Maitland, FL", notes: "No usar sopladora cerca del patio trasero.", servicePrice: 190, paymentDay: 25, visitDay1: 6, visitDay2: 20 },
    { name: "Elena Cruz (Ejemplo)", phone: "(555) 011-7745", address: "62 Orange Blossom Rd, Orlando, FL", notes: "Cliente de demostración, servicio frontal y trasero.", servicePrice: 240, paymentDay: 18, visitDay1: 8, visitDay2: 22 },
  ];

  for (let index = 0; index < examples.length; index++) {
    const item = examples[index];
    const client = await prisma.client.create({ data: item });
    const firstDay = item.visitDay1;
    const secondDay = item.visitDay2;
    const firstCompleted = index < 3;
    await prisma.visit.createMany({ data: [
      { clientId: client.id, scheduledDate: date(year, month, firstDay), completed: firstCompleted, actualDate: firstCompleted ? date(year, month, firstDay) : null, notes: firstCompleted ? "Servicio de demostración completado." : "" },
      { clientId: client.id, scheduledDate: date(year, month, secondDay), completed: false },
    ] });
    const paid = index === 0 || index === 2;
    const dueDay = Math.min(item.paymentDay, new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
    await prisma.payment.create({ data: { clientId: client.id, amount: item.servicePrice, dueDate: date(year, month, dueDay), status: paid ? "PAID" : "PENDING", paymentDate: paid ? date(year, month, Math.max(1, dueDay - 2)) : null, notes: "Cobro mensual de demostración por las dos visitas incluidas." } });
  }
}

main().then(() => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
