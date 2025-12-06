import Elysia, { t } from 'elysia'
import { html, Html } from '@elysiajs/html'
import QRCode from 'qrcode'
import { zeroId } from 'zero-id'
import { redis, s3 } from 'bun'
import { db } from './drizzle'
import { qrCodesTable } from './drizzle/schema'
import { eq } from 'drizzle-orm'
import { Ratelimit, fixedWindow } from 'bunlimit'

const ratelimit = new Ratelimit({
  redis,
  limiter: fixedWindow(3, 30),
})

const app = new Elysia()
  .use(html())
  .onBeforeHandle(async ({ request, status }) => {
    const ip = app.server?.requestIP(request)
    if (!ip?.address) {
      status(403)
      return { error: 'No ip address could be found to parse' }
    }

    const { success } = await ratelimit.limit(ip.address)
    if (!success) {
      status(429)
      return 'To many requests'
    }
  })
  .get('/', () => (
    <html lang='en'>
      <head>
        <title>Make a qr code lol</title>
      </head>
      <body>
        <form method='POST' action='/new'>
          <input placeholder='encodeText' name='encodeText' required />

          <button type='submit'>Submit</button>
        </form>
      </body>
    </html>
  ))
  .post(
    '/new',
    async ({ body, status, redirect }) => {
      try {
        const file = await QRCode.toBuffer(body.encodeText, {
          errorCorrectionLevel: 'H',
          color: {
            dark: '#000',
            light: '#fff',
          },
          width: 256,
        })

        const id = zeroId(20)
        const key = `/${id}.png`
        await s3.write(key, file)

        const qrCode = await db
          .insert(qrCodesTable)
          .values({
            fileKey: key,
            encodeText: body.encodeText,
          })
          .returning({ id: qrCodesTable.id })

        return redirect(`/view?id=${qrCode[0]!.id}`)
      } catch (error) {
        status(500)
        return { error }
      }
    },
    {
      body: t.Object({
        encodeText: t.String({ minLength: 7, maxLength: 500 }),
      }),
    }
  )
  .get(
    '/view',
    async ({ query, status }) => {
      try {
        const qrCode = await db.query.qrCodesTable.findFirst({ where: eq(qrCodesTable.id, query.id) })
        if (!qrCode) throw new Error('QR code was not found')

        const preUrl = s3.presign(qrCode.fileKey)
        return (
          <html lang='en'>
            <head>
              <title>{qrCode.id}</title>
            </head>
            <body>
              <img src={preUrl} width={512} height={512} />
            </body>
          </html>
        )
      } catch (error) {
        status(500)
        return { error }
      }
    },
    {
      query: t.Object({
        id: t.String({ minLength: 5, maxLength: 30 }),
      }),
    }
  )
  .listen(3000)

console.log(`Server running at http://${app.server?.hostname}:${app.server?.port}`)
