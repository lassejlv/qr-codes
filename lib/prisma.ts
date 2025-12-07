import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from './generated/prisma/client'

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_TURSO_URL!,
  authToken: process.env.DATABASE_TURSO_AUTH_TOKEN!,
})

export const prisma = new PrismaClient({ adapter })
