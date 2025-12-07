import { Hono } from 'hono'
import { getConnInfo } from 'hono/bun'
import { zValidator } from '@hono/zod-validator'
import { zeroId } from 'zero-id'
import { redis, s3 } from 'bun'
import { Ratelimit, fixedWindow } from 'bunlimit'
import { createQrSchema } from './lib/schema'
import { generateQrCode } from './lib/qr'
import { prisma } from './lib/prisma'

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

    const qrCode = await prisma.qRCode.create({
      data: {
        fileKey: key,
        encodeText: encodeText,
      },
    })

    return c.redirect(`/view/${qrCode.id}`)
  } catch (error) {
    const err = error as Error
    return c.json({ name: err.name, message: err.message, stack: err.stack, cause: err.cause }, 500)
  }
})

app.get('/view/:id', async (c) => {
  try {
    const id = c.req.param('id')

    const qrCode = await prisma.qRCode.findUnique({
      where: {
        id,
      },
    })

    if (!qrCode) throw new Error('QR code was not found')

    const preUrl = s3.presign(qrCode.fileKey)

    return c.render(
      <>
        <img src={preUrl} width={512} height={512} loading='lazy' />
      </>
    )
  } catch (error) {
    const err = error as Error
    return c.json({ name: err.name, message: err.message, stack: err.stack, cause: err.cause }, 500)
  }
})

export default {
  port: 3000,
  fetch: app.fetch,
}
