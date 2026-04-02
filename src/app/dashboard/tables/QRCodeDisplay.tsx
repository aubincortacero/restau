'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

export default function QRCodeDisplay({
  url,
  tableNumber,
}: {
  url: string
  tableNumber: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 160,
        margin: 2,
        color: { dark: '#ffffff', light: '#18181b' },
      })
    }
  }, [url])

  function download(variant: 'white' | 'black') {
    const offscreen = document.createElement('canvas')
    const size = 400
    offscreen.width = size
    offscreen.height = size
    QRCode.toCanvas(offscreen, url, {
      width: size,
      margin: 2,
      color: variant === 'white'
        ? { dark: '#ffffff', light: '#18181b' }
        : { dark: '#000000', light: '#ffffff' },
    }, (err) => {
      if (err) return
      const link = document.createElement('a')
      link.download = `table-${tableNumber}-qr-${variant}.png`
      link.href = offscreen.toDataURL('image/png')
      link.click()
    })
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={canvasRef} className="rounded-xl" />
      <div className="flex gap-2 w-full">
        <button
          onClick={() => download('white')}
          className="flex-1 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2 py-1.5 rounded-lg transition-colors cursor-pointer text-center"
          title="QR code blanc sur fond noir"
        >
          ⬜ Blanc
        </button>
        <button
          onClick={() => download('black')}
          className="flex-1 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2 py-1.5 rounded-lg transition-colors cursor-pointer text-center"
          title="QR code noir sur fond blanc"
        >
          ⬛ Noir
        </button>
      </div>
    </div>
  )
}
