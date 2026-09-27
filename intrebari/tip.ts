/**
 * Formatul intrebarilor
 * -------------------------------------------------------------
 * Fiecare test are un fisier in folderul `intrebari/`:
 *   smuls.ts, rezidentiat.ts, bls.ts, radio.ts
 *
 * Structura unei intrebari:
 *
 *   {
 *     id: 1,
 *     intrebare: "Textul intrebarii?",
 *     optiuni: ["Varianta A", "Varianta B", "Varianta C"],
 *     raspunsCorect: "Varianta C"   // TREBUIE sa fie exact una dintre optiuni
 *   }
 *
 * Indexul raspunsului corect este calculat automat din `raspunsCorect`
 * (vezi lib/intrebari.ts -> indexCorect), deci nu trebuie sa il setezi manual.
 *
 * ATENTIE: textul din `raspunsCorect` trebuie sa fie IDENTIC cu unul dintre
 * elementele din `optiuni`, altfel intrebarea va fi tratata ca fiind respinsa
 * de orice raspuns (index -1).
 */

export interface Intrebare {
  id: number;
  intrebare: string;
  optiuni: string[];
  raspunsCorect: string;
}
