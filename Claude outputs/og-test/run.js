const fs = require("fs"); const path = require("path");

const img = fs.readFileSync(path.join(__dirname, "../../public/event-default.jpg"));
const { fileURLToPath } = require("url");
const realFetch = global.fetch;
global.fetch = async (u) => {
  const s = String(u && u.href ? u.href : u);
  if (s.startsWith("data:")) return realFetch(u);
  if (s.startsWith("file:")) return new Response(fs.readFileSync(fileURLToPath(s)));
  if (s.includes("fonts.googleapis")) return new Response("src: url(https://font.test/c.woff) format('truetype');");
  if (s.includes("font.test")) return new Response(fs.readFileSync(path.join(__dirname, "cinzel.woff")));
  return new Response(img, { headers: { "content-type": "image/jpeg" } });
};
async function one(file, mock) {
  global.__MOCK__ = mock;
  delete require.cache[require.resolve("./mock.cjs")]; delete require.cache[require.resolve("./route.cjs")];
  const { GET } = require("./route.cjs");
  const res = await GET(new Request("http://x"), { params: Promise.resolve({ slug: "x" }) });
  fs.writeFileSync(path.join(__dirname, file), Buffer.from(await res.arrayBuffer()));
  console.log(file, res.status);
}
(async () => {
  await one("v3-eddie.png", {
    "fish_stores:one": { id: "1", name: "Eddie's Fin Farm", city: "Fountain Valley", state: "CA", logo_url: null },
    "store_reviews:many": [{ rating: 5 }, { rating: 4 }, { rating: 5 }],
  });
  await one("v3-long.png", {
    "fish_stores:one": { id: "2", name: "Aquarium Paradise of Greater Sacramento", city: "Sacramento", state: "CA", logo_url: null },
    "store_reviews:many": [],
  });
  await one("v3-logo.png", {
    "fish_stores:one": { id: "3", name: "Reef Kingdom", city: "Roseville", state: "CA", logo_url: "https://x/logo.jpg" },
    "store_reviews:many": [{ rating: 5 }],
  });
})().catch((e) => { console.error(e); process.exit(1); });
