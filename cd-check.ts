import { parseCooldownS } from "./lib/sheets";

const CAZURI: [string, Record<string, string>][] = [
  ["Radio 29.09 /bls 20.10/smuls 19.10", { radio: "29.09", bls: "20.10", smuls: "19.10" }],
  ["radio/bls 20.10", { radio: "20.10", bls: "20.10" }],
  ["radio /bls 20.10 smuls 19.10", { radio: "20.10", bls: "20.10", smuls: "19.10" }],
  ["bls 20.10 / radio 21.10/ smuls 18.10/rezi 17.10", { bls: "20.10", radio: "21.10", smuls: "18.10", rezidentiat: "17.10" }],
  ["SMULS T 19.10", { smuls: "19.10" }],
  ["S.M.U.L.S 19.10", { smuls: "19.10" }],
  ["Rezi (17.10)", { rezidentiat: "17.10" }],
  ["REZIDENTIAT 02.10", { rezidentiat: "02.10" }],
  ["B.L.S 20.10", { bls: "20.10" }],
  ["RADIO 20.10", { radio: "20.10" }],
  ["MOTO - ( 29.09 ) / PILOT 01.10", {}],
  ["radio", {}],
  ["radio/bls", {}],
  ["smuls / 20.10", { smuls: "20.10" }],
  ["20.10 / smuls", {}],
  ["bls 20.10 radio", { bls: "20.10" }],
  ["", {}],
  [null as unknown as string, {}],
  ["SUSPENDAT radio 20.10", { radio: "20.10" }],
  ["CONFISCAT radio 20.10", { radio: "20.10" }],
  ["confiscat bls 20.10", { bls: "20.10" }],
  ["SUSPENDAT radio", {}],
  ["SUSPENDAT radio 20.10 / bls 19.10", { radio: "20.10", bls: "19.10" }],
  ["bls 31.11", { bls: "30.11" }],
  ["bls 31.02", { bls: "28.02" }],
  ["bls 32.10", {}],
];

let esec = 0;
for (const [input, asteptat] of CAZURI) {
  const rez = parseCooldownS(input);
  const afisat: Record<string, string> = {};
  for (const [k, v] of Object.entries(rez)) {
    afisat[k] = new Date(v as number).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit" });
  }
  const ok = JSON.stringify(afisat) === JSON.stringify(asteptat);
  if (!ok) esec++;
  console.log(`${ok ? "OK  " : "FAIL"} | "${input}" -> ${JSON.stringify(afisat)}${ok ? "" : ` (asteptam ${JSON.stringify(asteptat)})`}`);
}
console.log(esec === 0 ? "\nToate cazurile trec." : `\n${esec} cazuri esuate.`);
