import { uploadImageToBucket } from './storage-image-upload'

const BUCKET = 'oneshot-images'

export async function uploadOneShotImage(file) {
  return uploadImageToBucket(file, BUCKET)
}
