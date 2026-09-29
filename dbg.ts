const text = "bls 20.10 / radio 21.10/ smuls 18.10/rezi 17.10";
const cursor =
  /(?<test>\bs\.?\s?m\.?\s?u\.?\s?l\.?\s?s\b|\bsmuls\b|\brezidentiat\b|\brezi\b|\bb\.?\s?l\.?\s?s\b|\bbls\b|\bradio\b|\btet\b)|(?<data>\d{1,2}\s*[./-]\s*\d{1,2}(?:\s*[./-]\s*\d{2,4})?)/gi;
for (const m of text.matchAll(cursor)) {
  console.log(JSON.stringify(m[0]), "-> test:", JSON.stringify(m.groups?.test), "data:", JSON.stringify(m.groups?.data));
}
