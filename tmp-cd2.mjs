const testDinText = (segment) => {
  const t = segment.toLowerCase();
  if (/\bsmuls\b|smuls|s\.?m\.?u\.?l\.?s/.test(t)) return 'smuls';
  if (/\brezi\b|rezidentiat/.test(t)) return 'rezidentiat';
  if (/\bbls\b/.test(t)) return 'bls';
  if (/\bradio\b|tet/.test(t)) return 'radio';
  return null;
};
function dataDinText(segment) {
  const m = segment.match(/(\d{1,2})\s*[./-]\s*(\d{1,2})(?:\s*[./-]\s*(\d{2,4}))?/);
  if (!m) return null;
  const zi = Number(m[1]); const luna = Number(m[2]);
  if (luna < 1 || luna > 12) return null;
  const acum = new Date();
  let an = m[3] ? Number(m[3]) : acum.getFullYear();
  if (m[3] && an < 100) an += 2000;
  if (!m[3]) {
    const c = new Date(an, luna - 1, zi); c.setHours(23, 59, 59, 999);
    if (c.getTime() < acum.getTime() - 30 * 86400000) an += 1;
  }
  const d = new Date(an, luna - 1, zi); d.setHours(23, 59, 59, 999);
  return isNaN(d.getTime()) ? null : d.getTime();
}
function parseCooldownS(continut) {
  const rezultat = {};
  if (!continut) return rezultat;
  for (const segment of String(continut).split('/')) {
    const test = testDinText(segment);
    if (!test) continue;
    const data = dataDinText(segment);
    if (data === null) continue;
    rezultat[test] = Math.max(rezultat[test] ?? 0, data);
  }
  return rezultat;
}

const azi = new Date();
let fail = 0;
function t(s, asteptat) {
  const r = parseCooldownS(s);
  const obtinut = Object.keys(r).sort();
  const ok = JSON.stringify(obtinut) === JSON.stringify(asteptat.sort());
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} "${s}" -> [${obtinut.join(',')}]`);
}
function dataLa(s, test) {
  const v = parseCooldownS(s)[test];
  return v ? new Date(v).toLocaleDateString('ro-RO') : 'niciuna';
}

console.log('azi =', azi.toLocaleDateString('ro-RO'), '\n');
t('', []);
t('PILOT 30.09', []);
t('Rezi - ( 29.09 )', ['rezidentiat']);
t('MOTO - ( 29.09 ) /PILOT 01.10', []);
t('SMULS P 30.09 /REZIDENTIAT 02.10', ['rezidentiat', 'smuls']);
t('BLS 12.09 /Radio 13.09', ['bls', 'radio']);
t('BLS 12.09 /SMULS 12.09 /REZI 12.09 /RADIO 12.09', ['bls', 'radio', 'rezidentiat', 'smuls']);
t('Rezi 01.01', ['rezidentiat']);
t('radio - 29.09', ['radio']);
t('Rezi - ( 29.09 ) /Radio 30.09 /BLS 28.09', ['bls', 'radio', 'rezidentiat']);
// SMULS practic / normal
t('SMULS PRACTIC 30.09', ['smuls']);
t('SMULS 30.09', ['smuls']);

console.log('\n--- verificare: data din S = data EXPIRARE (fara zile adaugate) ---');
const caz = 'Rezi - ( 29.09 ) /Radio 30.09 /BLS 28.09 /SMULS 05.10';
console.log('input:', caz);
for (const [k, v] of Object.entries(parseCooldownS(caz))) {
  console.log(`  ${k.padEnd(11)} -> ${new Date(v).toLocaleDateString('ro-RO')} 23:59`);
}

console.log(fail === 0 ? '\nOK - toate testele trec.' : `\n${fail} esuate.`);
process.exit(fail ? 1 : 0);
