// Node serverless function (deliberately NOT Python) — Vercel Blob's client-upload flow requires
// the official @vercel/blob SDK, which is JS-only. This is the one exception to the rest of the
// backend being FastAPI/Python: it hands the browser a short-lived, scoped token so a photo can be
// PUT directly from the browser to Blob storage without the file passing through our own function
// (avoids serverless request-body size limits, and keeps big uploads off the Python backend).
//
// Everything else — recording the resulting URL against an incident, auth, permissions — stays in
// the Python API. This file only ever talks to Vercel Blob.
//
// Docs: https://vercel.com/docs/vercel-blob/client-upload — re-check this against current docs on
// first deploy; Vercel's Blob SDK has moved fast historically.
import { handleUpload } from '@vercel/blob/client';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Require our own session cookie before handing out an upload token — otherwise anyone who
  // finds this URL could upload arbitrary files to your Blob store for free.
  const cookieHeader = request.headers.cookie || '';
  if (!cookieHeader.includes('qmh_session=')) {
    response.status(401).json({ error: 'Not signed in.' });
    return;
  }

  try {
    const jsonResponse = await handleUpload({
      body: request.body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/heic', 'image/webp'],
          addRandomSuffix: true,
          maximumSizeInBytes: 25 * 1024 * 1024, // 25MB per photo
        };
      },
      onUploadCompleted: async () => {
        // No-op: the frontend calls POST /api/incidents/{id}/photos itself once the upload
        // finishes, which is what actually attaches the photo to an incident in Postgres.
      },
    });
    response.status(200).json(jsonResponse);
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
}
