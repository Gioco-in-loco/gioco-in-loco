// Lists every file in the Supabase Storage buckets used by this app that no
// longer has a matching row in the database (e.g. an image that was
// replaced or whose association/oneshot/main-event was deleted). Uploads
// never delete the previous file (see storage-image-upload.js), so these
// accumulate over time.
//
// By default this is a read-only report. Pass --delete to actually remove
// the orphan files (asks for confirmation first, unless --yes is also
// passed).
import { createInterface } from 'readline/promises'
import { PrismaClient } from '@prisma/client'
import { createSupabaseServiceClient, isServiceRoleConfigured } from '../src/lib/supabase/service'

const prisma = new PrismaClient()
const shouldDelete = process.argv.includes('--delete')
const skipConfirmation = process.argv.includes('--yes')

interface BucketCheck {
  bucket: string
  fetchReferencedUrls: () => Promise<(string | null)[]>
}

const BUCKET_CHECKS: BucketCheck[] = [
  {
    bucket: 'association-logos',
    fetchReferencedUrls: async () =>
      (await prisma.association.findMany({ select: { logo: true } })).map((row) => row.logo),
  },
  {
    bucket: 'oneshot-images',
    fetchReferencedUrls: async () =>
      (await prisma.oneShot.findMany({ select: { image: true } })).map((row) => row.image),
  },
  {
    bucket: 'main-event-images',
    fetchReferencedUrls: async () =>
      (await prisma.mainEvent.findMany({ select: { image: true } })).map((row) => row.image),
  },
]

function extractFileName(url: string | null, bucket: string): string | null {
  if (!url) return null
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}

async function listAllFiles(admin: ReturnType<typeof createSupabaseServiceClient>, bucket: string) {
  const pageSize = 100
  let offset = 0
  const all: { name: string; id: string | null; created_at: string; metadata: { size?: number } | null }[] = []

  for (;;) {
    const { data, error } = await admin!.storage.from(bucket).list('', {
      limit: pageSize,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw new Error(`Impossibile leggere il bucket "${bucket}": ${error.message}`)
    if (!data || data.length === 0) break

    all.push(...data)
    if (data.length < pageSize) break
    offset += pageSize
  }

  // Supabase list() also returns folder placeholders (id: null) — this app
  // never uploads into subfolders, so treat any as noise and skip them.
  return all.filter((file) => file.id !== null)
}

async function main() {
  if (!isServiceRoleConfigured()) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY mancante: necessaria per listare lo storage.')
  }

  const admin = createSupabaseServiceClient()
  if (!admin) {
    throw new Error('Impossibile creare il client Supabase (service role).')
  }

  let totalOrphanBytes = 0
  const orphansByBucket = new Map<string, { name: string; size: number }[]>()

  for (const check of BUCKET_CHECKS) {
    console.log(`\nBucket: ${check.bucket}`)

    const [storageFiles, referencedUrls] = await Promise.all([
      listAllFiles(admin, check.bucket),
      check.fetchReferencedUrls(),
    ])

    const referencedNames = new Set(
      referencedUrls
        .map((url) => extractFileName(url, check.bucket))
        .filter((name): name is string => Boolean(name))
    )

    const orphans = storageFiles.filter((file) => !referencedNames.has(file.name))
    orphansByBucket.set(check.bucket, orphans.map((file) => ({ name: file.name, size: file.metadata?.size ?? 0 })))

    console.log(`  File nello storage: ${storageFiles.length}`)
    console.log(`  Referenziati nel DB: ${referencedNames.size}`)
    console.log(`  Orfani: ${orphans.length}`)

    for (const file of orphans) {
      const size = file.metadata?.size ?? 0
      totalOrphanBytes += size
      const { data } = admin.storage.from(check.bucket).getPublicUrl(file.name)
      console.log(`    - ${file.name}  (${(size / 1024).toFixed(1)} KB, creato ${file.created_at})`)
      console.log(`      ${data.publicUrl}`)
    }
  }

  const totalOrphans = Array.from(orphansByBucket.values()).reduce((sum, files) => sum + files.length, 0)
  console.log(`\nTotale file orfani: ${totalOrphans} (${(totalOrphanBytes / 1024 / 1024).toFixed(2)} MB)`)

  if (totalOrphans === 0) {
    return
  }

  if (!shouldDelete) {
    console.log('Nessun file è stato cancellato: questo script è solo un report. Rilancia con --delete per cancellarli.')
    return
  }

  if (!skipConfirmation) {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const answer = await rl.question(
      `\nStai per cancellare DEFINITIVAMENTE ${totalOrphans} file (${(totalOrphanBytes / 1024 / 1024).toFixed(2)} MB) dallo storage Supabase.\nScrivi "si" per confermare: `
    )
    rl.close()
    if (answer.trim().toLowerCase() !== 'si') {
      console.log('Annullato: nessun file cancellato.')
      return
    }
  }

  console.log('\nCancellazione in corso...')
  let deletedCount = 0
  let deletedBytes = 0

  for (const [bucket, files] of orphansByBucket) {
    if (files.length === 0) continue

    const { data, error } = await admin.storage.from(bucket).remove(files.map((file) => file.name))
    if (error) {
      console.error(`  ! Errore cancellando file dal bucket "${bucket}": ${error.message}`)
      continue
    }

    const deletedNames = new Set((data || []).map((file) => file.name))
    for (const file of files) {
      if (deletedNames.has(file.name)) {
        deletedCount += 1
        deletedBytes += file.size
      } else {
        console.warn(`  ! Non cancellato (verifica manualmente): ${bucket}/${file.name}`)
      }
    }
    console.log(`  - ${bucket}: cancellati ${deletedNames.size}/${files.length} file`)
  }

  console.log(`\nCancellati ${deletedCount}/${totalOrphans} file orfani (${(deletedBytes / 1024 / 1024).toFixed(2)} MB liberati).`)
}

main()
  .catch((error) => {
    console.error('Ricerca file orfani fallita:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
