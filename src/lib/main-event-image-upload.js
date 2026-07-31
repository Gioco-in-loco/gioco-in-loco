import { uploadImageToBucket } from './storage-image-upload'

const BUCKET = 'main-event-images'

export async function uploadMainEventImage(file) {
  return uploadImageToBucket(file, BUCKET)
}
