'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, RotateCcw, X } from 'lucide-react'

interface CameraDialogProps {
  /** Titre du document à photographier, null quand la fenêtre est fermée. */
  titre: string | null
  onPhoto: (fichier: File) => void
  onFermer: () => void
  /** Appelé si la caméra est inaccessible : on se rabat sur l'appareil photo du téléphone ou le choix de fichier. */
  onIndisponible: () => void
}

/** Ouvre la caméra de l'appareil (webcam ou caméra arrière du téléphone) pour photographier un document. */
export function CameraDialog({ titre, onPhoto, onFermer, onIndisponible }: CameraDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const flux = useRef<MediaStream | null>(null)
  const [pret, setPret] = useState(false)
  const [apercu, setApercu] = useState<{ url: string; fichier: File } | null>(null)
  const ouvert = titre !== null

  function arreterCamera() {
    flux.current?.getTracks().forEach((piste) => piste.stop())
    flux.current = null
    setPret(false)
  }

  async function demarrerCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      onIndisponible()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      flux.current = stream
      if (video.current) {
        video.current.srcObject = stream
        await video.current.play()
      }
      setPret(true)
    } catch {
      // Permission refusée ou pas de caméra.
      onIndisponible()
    }
  }

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (ouvert) {
      if (!d.open) d.showModal()
      void demarrerCamera()
    } else {
      arreterCamera()
      if (d.open) d.close()
    }
    return () => arreterCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert])

  useEffect(() => {
    return () => {
      if (apercu) URL.revokeObjectURL(apercu.url)
    }
  }, [apercu])

  function photographier() {
    const v = video.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext('2d')?.drawImage(v, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const fichier = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
        setApercu({ url: URL.createObjectURL(blob), fichier })
      },
      'image/jpeg',
      0.9,
    )
  }

  function valider() {
    if (!apercu) return
    onPhoto(apercu.fichier)
    setApercu(null)
    onFermer()
  }

  function fermer() {
    setApercu(null)
    onFermer()
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="titre-camera"
      onClose={fermer}
      className="m-auto w-[min(94vw,40rem)] rounded-3xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-foreground/60"
    >
      {ouvert && (
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="titre-camera" className="text-xl font-bold text-primary">
                Photo : {titre}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pose le document à plat, bien éclairé, et cadre-le en entier.
              </p>
            </div>
            <button
              type="button"
              onClick={fermer}
              aria-label="Fermer l'appareil photo"
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground outline-none hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-foreground/90">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {apercu && <img src={apercu.url} alt="Aperçu de la photo" className="w-full" />}
            <video
              ref={video}
              playsInline
              muted
              className={apercu ? 'hidden' : 'aspect-[4/3] w-full object-cover'}
            />
            {!pret && !apercu && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-white">
                Ouverture de l&apos;appareil photo…
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            {apercu ? (
              <>
                <button
                  type="button"
                  onClick={() => setApercu(null)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border px-5 font-semibold text-primary outline-none hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Reprendre
                </button>
                <button
                  type="button"
                  onClick={valider}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30"
                >
                  Utiliser cette photo
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={photographier}
                disabled={!pret}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30 disabled:opacity-50"
              >
                <Camera className="size-5" aria-hidden="true" />
                Prendre la photo
              </button>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
