// Storing files (integration-ports plan I3). Business code injects this port,
// never the provider SDK; STORAGE_DRIVER picks the adapter.
export type StoredResourceType = 'image' | 'video' | 'raw'

export interface PutFileInput {
  buffer: Buffer
  folder: string
  // the provider's resource kind: audio is stored as 'video'
  resourceType: StoredResourceType
  timeoutMs: number
  tags?: string[]
  // used by the local adapter to keep the extension; the provider names files itself
  originalName?: string
}

export interface StoredFile {
  url: string
  publicId: string
}

export interface PresignInput {
  publicId: string
  folder: string
  resourceType: StoredResourceType
  // images get format/quality auto
  image: boolean
  timestamp: number
}

export interface PresignedUpload {
  uploadUrl: string
  fileUrl: string
  signature: string
}

export abstract class FileStorage {
  // Rejects with the provider's error when the file was not stored
  abstract put(input: PutFileInput): Promise<StoredFile>
  // Rejects with Error('Invalid URL format') when the URL is not one of ours
  abstract delete(url: string): Promise<void>
  abstract publicIdFromUrl(url: string): string | null
  abstract presign(input: PresignInput): PresignedUpload
}
