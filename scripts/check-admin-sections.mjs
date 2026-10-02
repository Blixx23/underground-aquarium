// Runs before every build (npm "prebuild"). Fails the build if a page under
// src/app/admin isn't listed in src/lib/admin/sections.ts, so a new admin
// page can't ship without being connected to the menu, the dashboard, the
// waiting counts and the AI team.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const adminDir = "src/app/admin";
const registry = readFileSync("src/lib/admin/sections.ts", "utf8");

const missing = readdirSync(adminDir)
  .filter((name) => statSync(join(adminDir, name)).isDirectory())
  .filter((name) => !name.startsWith("(") && !name.startsWith("_") && !name.startsWith("["))
  .filter((name) => !registry.includes(`"/admin/${name}"`));

if (missing.length) {
  console.error("\nAdmin page not connected:");
  for (const name of missing) console.error(`  /admin/${name}`);
  console.error(
    "\nAdd it to ADMIN_SECTIONS in src/lib/admin/sections.ts (as a new section, or under another section's `also`).\n" +
      "If it has things waiting on Chris, give it a `queues` entry too. That one entry connects it to the menu,\n" +
      "the dashboard, the badge counts and the AI team.\n"
  );
  process.exit(1);
}
console.log("Admin sections: every admin page is connected.");
