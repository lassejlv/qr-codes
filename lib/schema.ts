import { z } from 'zod'

export const createQrSchema = z.object({
  encodeText: z.string().min(7).max(500),
})

export const viewQrSchema = z.object({
  id: z.string().min(5).max(30),
})

