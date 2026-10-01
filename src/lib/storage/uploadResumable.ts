"use client";

import { Upload } from "tus-js-client";

/**
 * Resumable upload straight to Supabase storage. Big files go up in 6 MB
 * pieces, so a dropped connection picks up where it left off instead of
 * starting over, and the uploader sees real progress.
 *
 * Shared by anything that uploads large files from the browser (course
 * videos today). Errors are turned into plain sentences a person can act on.
 */
export function uploadResumable(
  file: File,
  bucket: string,
  objectName: string,
  token: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const up = new Upload(file, {
      endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${token}`, "x-upsert": "false" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName: bucket,
        objectName,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      onError: (err) => {
        const body =
          (err as { originalResponse?: { getBody?: () => string } }).originalResponse?.getBody?.() ?? "";
        const text = body + String(err);
        if (/maximum allowed size|too large|413/i.test(text)) {
          reject(new Error("That file is too big to upload. Export it smaller (1080p) and try again."));
        } else if (/bucket not found/i.test(text)) {
          reject(new Error("Uploads aren't switched on yet. Run the course media SQL first."));
        } else if (/mime|content type|not allowed/i.test(text)) {
          reject(new Error("That file type isn't allowed. Use an MP4 or WebM video."));
        } else if (/row-level security|unauthorized|403/i.test(text)) {
          reject(new Error("Only admins can upload course media."));
        } else {
          reject(new Error("The upload didn't finish. Check your connection and try again."));
        }
      },
      onProgress: (sent, total) => onProgress(total ? Math.round((sent / total) * 100) : 0),
      onSuccess: () => resolve(),
    });
    up.findPreviousUploads().then((prev) => {
      if (prev.length) up.resumeFromPreviousUpload(prev[0]);
      up.start();
    });
  });
}
