import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const file = path.join("C:\\Users\\dodol\\Documents\\GitHub\\SITEMedici", "index.html");
let html = readFileSync(file, "utf8");
// Normalizam temporar la LF pentru a face matching-ul robust la CRLF.
const crlf = html.includes("\r\n");
if (crlf) html = html.replace(/\r\n/g, "\n");

// 1) M-010 = Xender NDC (conducere) + M-011 = AlMajdi Tariq
const m010 = `                    <img src="" alt="VACANT">
                </div>
                <div class="content">
                    <h1 class="rank"><small> M - </small>010</h1>
                    <h4>VACANT</h4>
                    <p2>Medic Chirurg</p2>
                    <p class="old">Vechime: </p>`;
const m010new = `                    <img src="./img_ndc.png" alt="Xender NDC">
                </div>
                <div class="content">
                    <h1 class="rank"><small> M - </small>010</h1>
                    <h4>Denis NDC (Xender)</h4>
                    <p2>Medic Chirurg</p2>
                    <p class="old">Vechime: 28.05.2026</p>`;

const m011 = `                    <img src="" alt="VACANT">
                </div>
                <div class="content">
                    <h1 class="rank"><small> M - </small>011</h1>
                    <h4>VACANT</h4>
                    <p2>Medic Chirurg</p2>
                    <p class="old">Vechime: </p>`;
const m011new = `                    <img src="./img_tariq3.PNG" alt="AlMajdi Tariq">
                </div>
                <div class="content">
                    <h1 class="rank"><small> M - </small>011</h1>
                    <h4>AlMajdi Tariq</h4>
                    <p2>Medic Chirurg</p2>
                    <p class="old">Vechime: 07.07.2026</p>`;

let count = 0;
const sub = (a, b, label) => {
  const n = html.split(a).length - 1;
  if (n !== 1) {
    console.log(`SKIP ${label}: ${n} potriviri`);
    return;
  }
  html = html.replace(a, b);
  count++;
  console.log(`OK ${label}`);
};

sub(m010, m010new, "M-010 Xender/Denis");
sub(m011, m011new, "M-011 Tariq");

// 2) Relații Publice: numele real al lui Xender e Denis NDC
sub(
  `<h4>Xender NDC</h4>`,
  `<h4>Denis NDC (Xender)</h4>`,
  "PR nume Denis",
);

if (crlf) html = html.replace(/\n/g, "\r\n");
writeFileSync(file, html, "utf8");
console.log(`\n${count} inlocuiri aplicate.`);
