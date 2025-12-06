import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { zeroId } from 'zero-id'

export const generateId = zeroId(20)

export const qrCodesTable = sqliteTable('qrCodes', {
  id: text().$defaultFn(zeroId).primaryKey(),
  fileKey: text().unique().notNull(),
  encodeText: text().notNull(),
  createdAt: text().$defaultFn(() => new Date().toString()),
})
