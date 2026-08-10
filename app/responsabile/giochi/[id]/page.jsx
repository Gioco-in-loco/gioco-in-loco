'use client'

import GameGDRDetail from '../../../../src/components/management/GameGDRDetail'

export default function ResponsabileGameGDRDetailPage({ params }) {
  return (
    <GameGDRDetail
      gameId={params.id}
      itemEndpointBase="/api/games-gdr"
      backHref="/responsabile/giochi"
    />
  )
}
