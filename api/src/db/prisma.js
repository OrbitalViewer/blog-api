import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // log: ['query'], // uncomment to see SQL in console while debugging
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
