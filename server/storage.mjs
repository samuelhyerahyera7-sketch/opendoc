import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { put } from '@vercel/blob'

// Vercel's function filesystem is ephemeral and not shared between
// invocations, so patient files can't live on local disk in production —
// they go to Vercel Blob instead. Locally (no BLOB_READ_WRITE_TOKEN set)
// we fall back to disk so development doesn't require a Blob store.
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const localUploadsDir = path.join(__dirname, 'data', 'uploads')

// Blob URLs are access-public (Vercel Blob's free tier has no private/
// signed-URL mode) but contain an unguessable random suffix, and — more
// importantly — are never handed to the browser directly. Every download
// goes through our own authenticated /api/files/:id/download route, which
// checks access before fetching the bytes server-side and streaming them
// back, so the URL alone isn't enough to reach a file through this app.
export async function uploadFile(buffer, originalName, mimeType) {
  if (useBlob) {
    const blob = await put(originalName, buffer, {
      access: 'public',
      contentType: mimeType,
      addRandomSuffix: true,
    })
    return { url: blob.url, path: blob.pathname }
  }

  await fs.mkdir(localUploadsDir, { recursive: true })
  const storedName = `${crypto.randomUUID()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  await fs.writeFile(path.join(localUploadsDir, storedName), buffer)
  return { url: `local:${storedName}`, path: storedName }
}

export async function readFile(storageUrl, storagePath) {
  if (storageUrl.startsWith('local:')) {
    return fs.readFile(path.join(localUploadsDir, storagePath))
  }
  const res = await fetch(storageUrl)
  if (!res.ok) throw new Error('Could not fetch file from storage')
  return Buffer.from(await res.arrayBuffer())
}
