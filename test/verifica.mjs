// Verificare rapida a bancilor de intrebari, fara framework.
// Ruleaza cu: node test/verifica.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "intrebari");
let probleme = 0;
const p = (m) => { probleme++; console.log("  PROBLEMA: " + m); };

for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts") && x !== "tip.ts")) {
  // fisierele sunt doar date; le transformam in module JS ca sa le putem importa
  const src = readFileSync(join(dir, f), "utf8")
    .replace(/^import type .*$/m, "")
    .replace(/: Intrebare\[\]/g, "");

  const mod = await import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));
  const lista = Object.values(mod)[0];
  if (!Array.isArray(lista)) { p(`${f}: nu exporteaza un array`); continue; }

  lista.forEach((q, i) => {
    const poz = i + 1;
    if (typeof q.id !== "number") p(`${f} #${poz}: id lipsa`);
    if (!q.intrebare || !q.intrebare.trim()) p(`${f} #${poz}: intrebare goala`);
    if (!Array.isArray(q.optiuni) || q.optiuni.length < 2) p(`${f} #${poz}: mai putin de 2 optiuni`);
    else if (q.optiuni.indexOf(q.raspunsCorect) < 0)
      p(`${f} #${poz} (id ${q.id}): raspunsCorect nu apare in optiuni`);
  });

  console.log(`${f}: ${lista.length} intrebari, ${lista.filter((q) => q.optiuni?.indexOf(q.raspunsCorect) >= 0).length} valide`);
}

const sig = readFileSync(join(root, "types", "tweetnacl.d.ts"), "utf8");
console.log("types/tweetnacl.d.ts: " + (sig.includes('declare module "tweetnacl"') ? "OK" : "LIPSA"));

console.log(probleme === 0 ? "\nTotul e OK" : `\n${probleme} probleme`);
process.exit(probleme === 0 ? 0 : 1);
