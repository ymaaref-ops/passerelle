import type { Metadata } from 'next'
import { ValidationPage } from '@/components/validation/validation-page'

export const metadata: Metadata = {
  title: "Relis avant d'envoyer — Passerelle",
  description:
    "Vérifie ton estimation APL, compare les prêts étudiants, télécharge tes documents et envoie chaque démarche toi-même depuis le site officiel.",
}

export default function ValidationRoute() {
  return <ValidationPage />
}
