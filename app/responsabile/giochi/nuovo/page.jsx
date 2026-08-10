'use client'

import GameGDRCreate from '../../../../src/components/management/GameGDRCreate'

export default function ResponsabileNewGameGDRPage() {
  return (
    <GameGDRCreate
      listEndpoint="/api/games-gdr"
      backHref="/responsabile/giochi"
    />
  )
}
