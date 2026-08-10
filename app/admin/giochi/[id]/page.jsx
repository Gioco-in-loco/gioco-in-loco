'use client'

import GameGDRDetail from '../../../../src/components/management/GameGDRDetail'

export default function AdminGameGDRDetailPage({ params }) {
  return (
    <GameGDRDetail
      gameId={params.id}
      itemEndpointBase="/api/games-gdr"
      backHref="/admin/giochi"
    />
  )
}
