import type { Intrebare } from "./tip";

export const INTREBARI_RADIO: Intrebare[] = [
  {
    id: 1,
    intrebare:
      "Ești la o intervenție unde se aud focuri de armă și există risc major. Ce mesaj corect transmiți?",
    optiuni: [
      "M-CALLSIGN, 10-50",
      "M-CALLSIGN, 10-11",
      "M-CALLSIGN, 10-0, 10-20 <locația>",
      "M-CALLSIGN, 10-33",
    ],
    raspunsCorect: "M-CALLSIGN, 10-0, 10-20 <locația>",
  },
  {
    id: 2,
    intrebare: "Primești un mesaj radio dar nu l-ai înțeles complet. Cum răspunzi corect?",
    optiuni: ["10-4", "10-1", "10-20", "10-9"],
    raspunsCorect: "10-9",
  },
  {
    id: 3,
    intrebare:
      "Ajungi la locul solicitării și constați că nu este nimeni acolo. Ce cod utilizezi?",
    optiuni: ["10-11", "10-0", "10-50", "10-55"],
    raspunsCorect: "10-11",
  },
  {
    id: 4,
    intrebare: "Cum soliciți liniște pe stație pentru o intervenție importantă?",
    optiuni: ["10-20", "10-33", "10-39", "10-78"],
    raspunsCorect: "10-33",
  },
  {
    id: 5,
    intrebare:
      "Ești în deplasare către o intervenție și vrei să anunți acest lucru. Ce mesaj este corect?",
    optiuni: [
      "M-CALLSIGN, 10-55",
      "M-CALLSIGN, 10-4",
      "M-CALLSIGN, 10-76",
      "M-CALLSIGN, 10-41",
    ],
    raspunsCorect: "M-CALLSIGN, 10-76",
  },
  {
    id: 6,
    intrebare:
      "La fața locului situația scapă de sub control și ai nevoie urgent de ajutor. Ce cod folosești?",
    optiuni: ["10-1", "10-78", "10-95", "10-100"],
    raspunsCorect: "10-78",
  },
  {
    id: 7,
    intrebare: "Cum anunți finalizarea unui apel?",
    optiuni: ["10-76", "10-50", "10-33", "10-55"],
    raspunsCorect: "10-55",
  },
  {
    id: 8,
    intrebare:
      "Ai un pacient conștient aflat în custodie și îl transporți la spital. Ce variantă este corectă?",
    optiuni: [
      "M-CALLSIGN, 10-50, 10-20",
      "M-CALLSIGN, 10-95 conștient, 10-76 spital",
      "M-CALLSIGN, 10-95 inconștient, 10-76 spital",
      "M-CALLSIGN, 10-78",
    ],
    raspunsCorect: "M-CALLSIGN, 10-95 conștient, 10-76 spital",
  },
  {
    id: 9,
    intrebare: "Ce cod este utilizat pentru a anunța regruparea?",
    optiuni: ["10-39", "10-20", "10-33", "10-76"],
    raspunsCorect: "10-39",
  },
  {
    id: 10,
    intrebare: "Codul de asistență 78 semnifică:",
    optiuni: [
      "Apel finalizat",
      "Necesitate poliție",
      "Asistență suplimentară",
      "Închidere stație",
    ],
    raspunsCorect: "Asistență suplimentară",
  },
  {
    id: 11,
    intrebare:
      "Primești informația că zona este sigură și poți interveni. Ce cod de asistență corespunde?",
    optiuni: ["Cod 5", "Cod 6", "Cod 7", "Cod 0"],
    raspunsCorect: "Cod 6",
  },
  {
    id: 12,
    intrebare:
      "Ești implicat într-un accident și nu mai poți ajunge la apelul inițial. Cum formulezi corect mesajul?",
    optiuni: [
      "M-CALLSIGN, 10-50 major/minor, nu mai pot ajunge",
      "M-CALLSIGN, 10-55",
      "M-CALLSIGN, 10-11",
      "M-CALLSIGN, 10-33",
    ],
    raspunsCorect: "M-CALLSIGN, 10-50 major/minor, nu mai pot ajunge",
  },
  {
    id: 13,
    intrebare:
      "Ai preluat un apel, ai ajuns la el, ai încercat să ajungi la pacient, dar accesul tău către acesta este imposibil de realizat. Cum anunți pe stație?",
    optiuni: [
      "M-CALLSIGN, 10-11",
      "M-CALLSIGN, 10-55",
      "M-CALLSIGN, 10-99",
      "M-CALLSIGN, 10-1",
    ],
    raspunsCorect: "M-CALLSIGN, 10-99",
  },
];
