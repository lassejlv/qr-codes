import QRCode from 'qrcode'

export async function generateQrCode(text: string) {
  return QRCode.toBuffer(text, {
    errorCorrectionLevel: 'H',
    color: {
      dark: '#000',
      light: '#fff',
    },
    width: 256,
  })
}

