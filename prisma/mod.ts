import { PrismaClient } from "./generated/client.ts";

const prisma = new PrismaClient();

export default prisma;
export type { Prisma } from "./generated/client.ts";
