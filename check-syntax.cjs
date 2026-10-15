// Analisi del parsing di tutti i TypeScript e TSX, non sostituisce un typecheck.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.join(__dirname, '..', 'apps');
const files = [];
function visit(dir) {
  for (const e of fs.readdirSync(dir,{withFileTypes:true})) {
    const target=path.join(dir,e.name);
    if(e.isDirectory())visit(target);
    else if(/\.tsx?$/.test(target))files.push(target);
  }
}
visit(root);
let errors=0;
for(const file of files){
  const kind=file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS;
  const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.ES2022,true,kind);
  for(const diag of ast.parseDiagnostics){
    errors++;
    const pos=ast.getLineAndCharacterOfPosition(diag.start||0);
    process.stderr.write(`${path.relative(root,file)}:${pos.line+1}:${pos.character+1}: ${ts.flattenDiagnosticMessageText(diag.messageText,' ')}\n`);
  }
}
console.log(`Controllo sintattico: ${files.length} file TS/TSX, ${errors} errori di parsing.`);
if(errors)process.exitCode=1;
