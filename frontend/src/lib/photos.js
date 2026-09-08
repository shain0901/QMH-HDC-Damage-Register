import { upload } from '@vercel/blob/client';

// Uploads straight from the browser to Vercel Blob storage (see api/blob-upload-url.js for the
// token exchange). Returns the resulting public URL — the caller is responsible for recording it
// against an incident via api.attachPhoto().
export async function uploadPhoto(file) {
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/blob-upload-url',
  });
  return blob.url;
}
