const ts = require("../../node_modules/typescript");
const fs = require("fs");
const opts = { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } };
const map = [
  ["../../src/lib/og/card.tsx", "sp-card.cjs"],
  ["../../src/app/api/species/share-image/route.tsx", "sp-section.cjs"],
  ["../../src/app/api/species/[slug]/share-image/route.tsx", "sp-species.cjs"],
];
for (const [src, out] of map) {
  let code = ts.transpileModule(fs.readFileSync(src, "utf8"), opts).outputText;
  code = code.replace(/require\("@\/lib\/og\/card"\)/g, 'require("./sp-card.cjs")')
             .replace(/require\("@\/lib\/supabase\/public"\)/g, 'require("./sp-mock.cjs")')
             .replace(/require\("@\/lib\/supabase\/admin"\)/g, 'require("./sp-mock.cjs")');
  fs.writeFileSync(out, code);
}
fs.writeFileSync("sp-mock.cjs", `
const data = () => global.__MOCK__;
function b(t){ const q={select:()=>q,eq:()=>q,not:()=>q,order:()=>q,limit:()=>q,
  maybeSingle: async()=>({data:data()[t+":one"]??null,error:null}),
  then:(r)=>r({data:data()[t+":many"]??[],count:data()[t+":count"]??null,error:null})}; return q; }
const c = { from:(t)=>b(t), rpc: async(n)=>({data:data()["rpc:"+n]??[],error:null}) };
exports.supabasePublic = c; exports.supabaseAdmin = c;`);
