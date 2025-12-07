import { Hono } from 'hono'
import { getConnInfo } from 'hono/bun'
import { zValidator } from '@hono/zod-validator'
import { zeroId } from 'zero-id'
import { redis, s3 } from 'bun'
import { db } from './drizzle'
import { qrCodesTable } from './drizzle/schema'
import { eq } from 'drizzle-orm'
import { Ratelimit, fixedWindow } from 'bunlimit'
import { createQrSchema, viewQrSchema } from './lib/schema'
import { generateQrCode } from './lib/qr'

const ratelimit = new Ratelimit({
  redis,
  limiter: fixedWindow(100, 60_000),
})

const app = new Hono()

app.use('*', async (c, next) => {
  const info = getConnInfo(c)

  if (!info.remote.address) {
    return c.json({ error: 'No ip address could be found to parse' }, 400)
  }

  const { success, remaining, reset } = await ratelimit.limit(info.remote.address)

  c.header('x-ratelimit-remaining', remaining.toString())
  c.header('x-ratelimit-reset', String(reset))

  if (!success) {
    return c.text('To many requests', 429)
  }

  await next()
})

app.get('/', (c) => {
  return c.render(
    <html lang='en'>
      <head>
        <title>Make a qr code lol</title>
      </head>
      <body>
        <form method='post' action='/new'>
          <input placeholder='encodeText' name='encodeText' required />

          <button type='submit'>Submit</button>
        </form>
      </body>
    </html>
  )
})

app.post('/new', zValidator('form', createQrSchema), async (c) => {
  try {
    const { encodeText } = c.req.valid('form')

    const file = await generateQrCode(encodeText)

    const id = zeroId(20)
    const key = `/${id}.png`
    await s3.write(key, file)

    const qrCode = await db
      .insert(qrCodesTable)
      .values({
        fileKey: key,
        encodeText: encodeText,
      })
      .returning({ id: qrCodesTable.id })

    return c.redirect(`/view/${qrCode[0]!.id}`)
  } catch (error) {
    return c.json({ error }, 500)
  }
})

app.get('/view/:id', zValidator('param', viewQrSchema), async (c) => {
  try {
    const { id } = c.req.valid('param')
    const qrCode = await db.query.qrCodesTable.findFirst({
      where: eq(qrCodesTable.id, id),
    })
    if (!qrCode) throw new Error('QR code was not found')

    const preUrl = s3.presign(qrCode.fileKey)
    return c.redirect(preUrl)
  } catch (error) {
    return c.json({ error }, 500)
  }
})

export default {
  port: 3000,
  fetch: app.fetch,
}

console.log(`Server running at http://localhost:3000`)
