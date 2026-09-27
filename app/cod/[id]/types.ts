export type TestConfig = {
  id: string;
  nume: string;
  descriere: string;
  timpSecunde: number;
  greseliPermise: number;
};

export type IntrebareClient = {
  i: number;
  intrebare: string;
  variante: string[];
  total: number;
};

export type StareRaspuns =
  | { ok: true; corect: boolean; index: number; total: number; terminat?: boolean; scor?: number }
  | { ok: false; mesaj: string };
