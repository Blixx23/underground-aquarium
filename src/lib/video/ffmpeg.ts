import "server-only";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

type Result = { code: number | null; log: string };

/** Runs the ffmpeg binary that ships with the site (ffmpeg-static). */
function run(args: string[], timeoutMs: number): Promise<Result> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("The video converter isn't available on this server."));
    const child = spawn(ffmpegPath, ["-hide_banner", ...args], { stdio: ["ignore", "ignore", "pipe"] });
    let log = "";
    child.stderr.on("data", (d: Buffer) => {
      log += d.toString();
      if (log.length > 200_000) log = log.slice(-100_000);
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Converting took too long."));
    }, timeoutMs);
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, log });
    });
  });
}

/** ffmpeg that must succeed. Rejects with the last lines of its log. */
export async function ffmpeg(args: string[], timeoutMs = 240_000): Promise<string> {
  const { code, log } = await run(args, timeoutMs);
  if (code !== 0) {
    throw new Error(log.split("\n").filter(Boolean).slice(-3).join(" ") || `ffmpeg exited ${code}`);
  }
  return log;
}

export type Probe = { duration: number | null; width: number | null; height: number | null; hasVideo: boolean };

/**
 * Length and picture size, read from ffmpeg's report on the file.
 * (`ffmpeg -i file` with no output always exits non-zero; the report is
 * still complete.)
 */
export async function probe(file: string): Promise<Probe> {
  const { log } = await run(["-i", file], 30_000);
  const d = log.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const duration = d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : null;
  const v = log.match(/Stream #\d+:\d+[^\n]*Video:[^\n]*?\s(\d{2,5})x(\d{2,5})/);
  // Phones store portrait video sideways with a rotation flag. The
  // converter applies it, so swap to the size people will actually see.
  const rotated = /rotation of -?(90|270)\.00 degrees/.test(log);
  let width = v ? Number(v[1]) : null;
  let height = v ? Number(v[2]) : null;
  if (rotated && width && height) [width, height] = [height, width];
  return { duration, width, height, hasVideo: !!v };
}
