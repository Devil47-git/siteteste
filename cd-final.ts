import { parseCooldownS, formatDataRo } from "./lib/sheets";

const AZI = new Date();
console.log("Acum:", AZI.toString(), "| TZ:", Intl.DateTimeFormat().resolvedOptions().timeZone, "\n");

// Verificam exact cazul din raport: "radio confiscat 30.09" intr-o zi oare.
const rez = parseCooldownS("radio confiscat 30.09");
const radio = rez.radio;
console.log('Docs: "radio confiscat 30.09"');
console.log("  data parseata :", new Date(radio!).toISOString());
console.log("  afisata site  :", formatDataRo(radio!));
console.log("  CD ramas (ms) :", Math.round((radio! - Date.now()) / 60000), "minute");

// Testul 1: CD-ul nu mai sare cu o zi in plus.
const asteptat = new Date();
const aziStr = String(asteptat.getDate()).padStart(2, "0");
const lunaStr = String(asteptat.getMonth() + 1).padStart(2, "0");
const r = parseCooldownS(`radio ${aziStr}.${lunaStr}`);
console.log(`\nDocs: "radio ${aziStr}.${lunaStr}" (azi)`);
console.log("  afisata site  :", formatDataRo(r.radio!), " <-- trebuie sa fie AZI, nu maine");
console.log("  CD ramas      :", r.radio! - Date.now(), "ms <-- 0 sau negativ = testul e disponibil");

// Testul 2: o data de ieri => CD expirat, testul disponibil.
const ieri = new Date(Date.now() - 86400000);
const iStr = String(ieri.getDate()).padStart(2, "0");
const iLuna = String(ieri.getMonth() + 1).padStart(2, "0");
const r2 = parseCooldownS(`radio ${iStr}.${iLuna}`);
console.log(`\nDocs: "radio ${iStr}.${iLuna}" (ieri)`);
console.log("  CD ramas      :", r2.radio! - Date.now(), "ms (negativ = expirat, OK)");

// Testul 3: data de maine => CD activ.
const maine = new Date(Date.now() + 86400000);
const mStr = String(maine.getDate()).padStart(2, "0");
const mLuna = String(maine.getMonth() + 1).padStart(2, "0");
const r3 = parseCooldownS(`radio ${mStr}.${mLuna}`);
console.log(`\nDocs: "radio ${mStr}.${mLuna}" (maine)`);
console.log("  afisata site  :", formatDataRo(r3.radio!), " <-- trebuie sa fie maine");
console.log("  CD ramas      :", Math.round((r3.radio! - Date.now()) / 3600000), "ore (activ, corect)");
