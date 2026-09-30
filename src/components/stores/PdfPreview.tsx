"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

/** One pdf.js load for the whole page. The worker file lives in /public. */
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((m) => {
      m.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return m;
    });
  }
  return pdfjsPromise;
}

/**
 * Draws page 1 of a PDF into the box, so owners see exactly what they'll
 * print before downloading. Renders when it scrolls into view, sized to the
 * box and the screen's sharpness.
 */
export default function PdfPreview({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"waiting" | "loading" | "ready" | "failed">("waiting");

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let cancelled = false;
    let task: { cancel: () => void } | null = null;

    async function draw() {
      setState("loading");
      try {
        const pdfjs = await loadPdfjs();
        const loading = pdfjs.getDocument({ url: src });
        const doc = await loading.promise;
        const page = await doc.getPage(1);
        if (cancelled || !canvasRef.current || !boxRef.current) return;
        const base = page.getViewport({ scale: 1 });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const scale = (boxRef.current.clientWidth * ratio) / base.width;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const render = page.render({ canvas, viewport });
        task = render;
        await render.promise;
        if (!cancelled) setState("ready");
        void loading.destroy();
      } catch {
        if (!cancelled) setState("failed");
      }
    }

    // Only draw once it's on screen, so four posters don't all load at once.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          draw();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(box);

    return () => {
      cancelled = true;
      io.disconnect();
      task?.cancel();
    };
  }, [src]);

  return (
    <div
      ref={boxRef}
      role="img"
      aria-label={alt}
      className={`relative aspect-[17/22] w-full overflow-hidden rounded-lg bg-white/5 ${className}`}
    >
      <canvas ref={canvasRef} className={`h-full w-full ${state === "ready" ? "" : "invisible"}`} />
      {state !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-ocean-500">
          {state === "failed" ? (
            "Preview isn't available here. The download still works."
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-ocean-400" />
          )}
        </div>
      )}
    </div>
  );
}
