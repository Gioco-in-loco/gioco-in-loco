'use client'

import GameGDRCreate from '../../../../src/components/management/GameGDRCreate'

export default function AdminNewGameGDRPage() {
  return (
    <GameGDRCreate
      listEndpoint="/api/games-gdr"
      backHref="/admin/giochi"
    />
  )
}
