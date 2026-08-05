import { uploadImageToBucket } from './storage-image-upload'

const BUCKET = 'association-logos'

export async function uploadAssociationLogo(file) {
  return uploadImageToBucket(file, BUCKET)
}
