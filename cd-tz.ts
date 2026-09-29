import { parseCooldownS, formatDataRo } from "./lib/sheets";

let esec = 0;
const check = (nume: string, cond: boolean, detaliu = "") => {
  if (!cond) esec++;
  console.log(`${cond ? "OK  " : "FAIL"} | ${nume} ${detaliu}`);
};

// Verificam ca data e citita corect in Romania, indiferent de fusul serverului.
for (const [zi, luna] of [
  [15, 1], [15, 3], [15, 6], [15, 7], [15, 10], [15, 12], [1, 1], [31, 12], [1, 3], [28, 2],
] as [number, number][]) {
  const an = 2026;
  const ziS = String(zi).padStart(2, "0");
  const lunaS = String(luna).padStart(2, "0");
  const r = parseCooldownS(`radio ${ziS}.${lunaS}.${an}`);
  const afisat = r.radio ? formatDataRo(r.radio) : "MISSING";
  const corect = afisat === `${ziS}.${lunaS}.${an}`;
  check(`${ziS}.${lunaS}.${an}`, corect, `-> afisat: ${afisat}`);
}

// CD-ul trebuie sa expire la INCEPUTUL zilei scrise, nu la sfarsit.
const h = (n: number) => {
  const d = new Date(Date.now() + n * 3600000);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const a = parseCooldownS(`radio ${h(48)}`);
check("CD peste 2 zile este activ", (a.radio as number) > Date.now(), `(${formatDataRo(a.radio as number)})`);
const b = parseCooldownS(`radio ${h(-2)}`);
check("CD de acum 2 zile este expirat", (b.radio as number) < Date.now());

console.log(esec === 0 ? "\nToate testele trec." : `\n${esec} esuate.`);
