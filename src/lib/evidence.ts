import type { EvidenceFile, EvidenceKind } from '@/types'
import { createId } from '@/lib/delivery-ids'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function evidenceKindLabel(kind: EvidenceKind): string {
  const map: Record<EvidenceKind, string> = {
    delivery_note: 'Delivery note',
    weighing_ticket: 'Weighing ticket',
    photo: 'Photo evidence',
    transport_doc: 'Transport document',
    other: 'Other',
  }
  return map[kind]
}

export async function fileToEvidence(
  file: File,
  kind: EvidenceKind,
  uploadedBy: string,
  note?: string,
): Promise<EvidenceFile> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Only PDF, JPG, PNG or WEBP files are accepted.')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('File must be 5 MB or smaller.')
  }

  return {
    id: createId('ev'),
    kind,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    previewUrl: URL.createObjectURL(file),
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    note:
      note ??
      'Local browser file for demo only — not uploaded to cloud storage.',
  }
}

export function revokeEvidenceUrls(files: EvidenceFile[]): void {
  for (const file of files) {
    if (file.previewUrl) URL.revokeObjectURL(file.previewUrl)
  }
}
