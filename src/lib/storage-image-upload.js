import { createSupabaseServiceClient, isServiceRoleConfigured } from './supabase/service'

const MAX_FILE_SIZE = 3 * 1024 * 1024
const ALLOWED_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const ensuredBuckets = new Set()

function createHttpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

async function ensureBucket(admin, bucket) {
  if (ensuredBuckets.has(bucket)) return

  const { data } = await admin.storage.getBucket(bucket)
  if (!data) {
    await admin.storage.createBucket(bucket, { public: true, fileSizeLimit: MAX_FILE_SIZE })
  }
  ensuredBuckets.add(bucket)
}

// Only the public URL (a short string) is ever written to the database — the
// actual image bytes live in Supabase Storage, so images can't bloat the
// Postgres database no matter how many are uploaded.
export async function uploadImageToBucket(file, bucket) {
  if (!isServiceRoleConfigured()) {
    throw createHttpError(503, 'Upload immagini non configurato.')
  }

  if (!file || typeof file.arrayBuffer !== 'function') {
    throw createHttpError(400, 'Nessun file ricevuto.')
  }

  const extension = ALLOWED_TYPES[file.type]
  if (!extension) {
    throw createHttpError(400, 'Formato non supportato. Usa PNG, JPEG, WEBP o GIF.')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw createHttpError(400, `Immagine troppo grande (max ${MAX_FILE_SIZE / (1024 * 1024)}MB).`)
  }

  const admin = createSupabaseServiceClient()
  await ensureBucket(admin, bucket)

  const buffer = Buffer.from(await file.arrayBuffer())
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`

  const { error } = await admin.storage.from(bucket).upload(fileName, buffer, {
    contentType: file.type,
    upsert: false,
  })

  if (error) {
    throw createHttpError(500, 'Caricamento immagine non riuscito.')
  }

  const { data } = admin.storage.from(bucket).getPublicUrl(fileName)
  return data.publicUrl
}
