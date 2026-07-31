import { redirect } from 'next/navigation'
import ResponsabileDashboard from '../../src/components/responsabile/ResponsabileDashboard'
import { requireResponsabile } from '../../src/lib/admin-guard'
import { getResponsabileAssociation } from '../../src/lib/responsabile'

export default async function ResponsabilePage() {
  const responsabile = await requireResponsabile()
  if (!responsabile) redirect('/')

  if (!responsabile.associationId) {
    return (
      <div className="rounded-2xl border border-editorial-border bg-white p-8 shadow-soft">
        <p className="font-body text-xs font-semibold uppercase tracking-widest text-editorial-terra">Area responsabile</p>
        <h1 className="mt-2 font-elegant text-3xl font-bold text-editorial-text">Associazione non assegnata</h1>
        <p className="mt-3 font-body text-sm text-editorial-text-secondary">
          Il tuo account non ha ancora una associazione collegata. Serve un intervento admin per completare la configurazione.
        </p>
      </div>
    )
  }

  const association = await getResponsabileAssociation(responsabile.associationId)

  if (!association) redirect('/')

  return <ResponsabileDashboard initialAssociation={association} />
}