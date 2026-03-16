import { useCallback, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'
import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onClose: () => void
  onDetected: (code: string) => void
}

export function BarcodeScanner({ open, onClose, onDetected }: Props) {
  const controlsRef = useRef<IScannerControls | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Callback ref: called by React as soon as the <video> element is mounted in the DOM
  const videoRef = useCallback((videoEl: HTMLVideoElement | null) => {
    if (!videoEl) {
      controlsRef.current?.stop()
      controlsRef.current = null
      return
    }

    if (!navigator.mediaDevices) {
      setError('Camera access requires HTTPS. Open the app over https:// or use localhost.')
      return
    }

    setError(null)
    const reader = new BrowserMultiFormatReader()
    reader.decodeFromVideoDevice(undefined, videoEl, (result) => {
      if (result) {
        onDetected(result.getText())
        onClose()
      }
    }).then((controls) => {
      controlsRef.current = controls
    }).catch((e) => {
      setError(e instanceof Error ? e.message : 'Camera access failed')
    })
  }, [onDetected, onClose])

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Scan barcode / ISBN</DialogTitle>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <video ref={videoRef} className="w-full rounded-lg" />
        )}
        <p className="text-xs text-muted-foreground text-center">
          Point the camera at a barcode or ISBN
        </p>
        <Button variant="outline" onClick={onClose}>
          <X className="mr-2 h-4 w-4" /> Cancel
        </Button>
      </DialogContent>
    </Dialog>
  )
}
