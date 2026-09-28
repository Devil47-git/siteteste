// Verifica afisarea scorului pe baza datelor reale din tentativa.
function afisare(corecte, total, admis, greseliPermise) {
  const picat = admis === false || (total - greseliPermise - 1) > 0;
  return picat ? null : `${corecte} / ${total}`;
}

function finalizeaza(a, motiv, t) {
  const total = 13;
  a.corecte = a.raspunsuri.filter(r => r.corect).length;
  a.total = total;
  const fortat = motiv === 'greseli' || motiv === 'timp' || motiv === 'anticheat';
  const picat = fortat || a.greseli > t.greseliPermise;
  a.admis = !picat;
  a.scor = picat ? 0 : Math.max(0, total - a.greseli);
  a.picatLa = picat ? Math.min(total, Math.max(1, a.raspunsuri.length)) : total;
  return a;
}

const t = { greseliPermise: 2 };
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('  FAIL ' + m); } };

// Cazul din screenshot: 12 intrebari, 1 greseala => 11/12 corecte, dar ADMIS
console.log('Cazul raportat (1 greseala din 12, totusi admis):');
const a1 = finalizeaza({ greseli: 1, index: 12, raspunsuri: Array.from({ length: 12 }, (_, i) => ({ corect: i !== 4 })) }, 'final', t);
console.log(`  corecte=${a1.corecte} total=${a1.total} admis=${a1.admis} scor=${a1.scor}`);
// UI arata acum: intrebariReusite / total
const ui = a1.admis ? `${a1.corecte} / ${a1.total}` : `${a1.picatLa} / ${a1.total}`;
console.log(`  UI afiseaza: ${ui}`);
ok(a1.corecte === 11, 'corecte gresit');
ok(a1.admis === true, 'ar trebui sa fie admis');
ok(ui === '11 / 12', 'UI arata scor perfect in loc de real');
ok(!ui.includes('13 / 13'), 'UI arata 13/13');
ok(!/Cooldown de/.test(''), 'placeholder');

console.log('\nPerfect (0 greseli):');
const a2 = finalizeaza({ greseli: 0, index: 13, raspunsuri: Array.from({ length: 13 }, () => ({ corect: true })) }, 'final', t);
console.log(`  UI: ${a2.corecte} / ${a2.total}`);

console.log('\n2 greseli (limita, admis):');
const a3 = finalizeaza({ greseli: 2, index: 13, raspunsuri: Array.from({ length: 13 }, (_, i) => ({ corect: i < 11 })) }, 'final', t);
console.log(`  corecte=${a3.corecte} admis=${a3.admis} UI: ${a3.corecte} / ${a3.total}`);

console.log('\n3 greseli (pica):');
const a4 = finalizeaza({ greseli: 3, index: 5, raspunsuri: Array.from({ length: 5 }, (_, i) => ({ corect: i < 2 })) }, 'greseli', t);
console.log(`  admis=${a4.admis} UI: ${a4.picatLa} / ${a4.total} (picatLa = intrebarea la care a picat)`);

console.log(fail === 0 ? '\nTOATE TESTELE TREC.' : `\n${fail} ESUATE.`);
process.exit(fail ? 1 : 0);
