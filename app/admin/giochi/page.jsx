'use client'

import GamesGDRManager from '../../../src/components/management/GamesGDRManager'

export default function AdminGamesGDRPage() {
  return (
    <GamesGDRManager
      listEndpoint="/api/games-gdr"
      routeBasePath="/admin/giochi"
    />
  )
}
