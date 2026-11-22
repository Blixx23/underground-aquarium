// Quick health check of the live site: loads the pages members use most and
// fails loudly if any of them errors. Run after a deploy:
//   npm run smoke            (checks www.undergroundaquarium.com)
//   npm run smoke -- <url>   (checks a Vercel preview instead)
const base = (process.argv[2] || "https://www.undergroundaquarium.com").replace(/\/$/, "");

const pages = [
  "/",
  "/feed",
  "/listings",
  "/marketplace",
  "/forums",
  "/stores",
  "/aquarium-stores",
  "/species",
  "/tank-builder",
  "/water-check",
  "/society",
  "/events",
  "/help",
  "/login",
  "/post",
  "/sitemap.xml",
  "/robots.txt",
];

let failed = 0;
for (const path of pages) {
  const started = Date.now();
  try {
    const res = await fetch(base + path, { redirect: "follow", headers: { "user-agent": "UA-smoke-check" } });
    const body = await res.text();
    const ms = Date.now() - started;
    const broken = !res.ok || /Application error|Internal Server Error|This page couldn.t load/i.test(body);
    if (broken) failed++;
    console.log(`${broken ? "FAIL" : " ok "}  ${res.status}  ${String(ms).padStart(5)} ms  ${path}`);
  } catch (err) {
    failed++;
    console.log(`FAIL  ---      --  ${path}  (${err.message})`);
  }
}

console.log(failed ? `\n${failed} page(s) broken.` : "\nAll pages loaded.");
process.exit(failed ? 1 : 0);
