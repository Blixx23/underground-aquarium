const ts = require("../../node_modules/typescript");
const fs = require("fs");
for (const [src, out] of [["route.tsx", "route.cjs"], ["mock.ts", "mock.cjs"]]) {
  let code = ts.transpileModule(fs.readFileSync(src, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  code = code.replace('require("./mock")', 'require("./mock.cjs")');
  fs.writeFileSync(out, code);
}
