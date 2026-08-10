'use client'

import GamesGDRManager from '../../../src/components/management/GamesGDRManager'

export default function ResponsabileGamesGDRPage() {
  return (
    <GamesGDRManager
      listEndpoint="/api/games-gdr"
      routeBasePath="/responsabile/giochi"
    />
  )
}
