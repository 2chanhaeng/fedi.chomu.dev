import { PrismaClient } from "./generated/client.ts";

const prisma = new PrismaClient();

export default prisma;
export type {
  Account,
  Actor,
  Follow,
  Key,
  Post,
  Prisma,
  User,
} from "./generated/client.ts";
