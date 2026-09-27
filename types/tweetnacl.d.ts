// Declaratii locale pentru `tweetnacl`: pachetul nu publica tipuri, iar
// `@types/tweetnacl` nu exista pe npm (404 la install).
declare module "tweetnacl" {
  export interface SignKeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }

  export interface BoxKeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }

  export interface SignedMessage {
    message: Uint8Array;
    signature: Uint8Array;
  }

  export const sign: {
    keyPair: () => SignKeyPair;
    detached: {
      sign: (message: Uint8Array, secretKey: Uint8Array) => Uint8Array;
      verify: (signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array) => boolean;
    };
    attached: {
      sign: (message: Uint8Array, secretKey: Uint8Array) => SignedMessage;
      verify: (signedMessage: Uint8Array, publicKey: Uint8Array) => SignedMessage | null;
    };
  };

  export const box: {
    keyPair: () => BoxKeyPair;
    fromSecretKey: (secretKey: Uint8Array) => BoxKeyPair;
    precompute: (publicKey: Uint8Array, secretKey: Uint8Array) => Uint8Array;
    open: (
      ciphertext: Uint8Array,
      nonce: Uint8Array,
      theirPublicKey: Uint8Array,
      yourSecretKey: Uint8Array,
    ) => Uint8Array | null;
    before: (publicKey: Uint8Array) => void;
  };

  export const secretbox: {
    (message: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array;
    open: (box: Uint8Array, nonce: Uint8Array, key: Uint8Array) => Uint8Array | null;
    keyLength: number;
  };

  export const hash: (message: Uint8Array) => Uint8Array;
  export const randomBytes: (n: number) => Uint8Array;
  export const timingSafeEqual: (a: Uint8Array, b: Uint8Array) => boolean;

  // tweetnacl este CommonJS, iar proiectul consuma `import nacl from "tweetnacl"`.
  const nacl: {
    sign: typeof sign;
    box: typeof box;
    secretbox: typeof secretbox;
    hash: typeof hash;
    randomBytes: typeof randomBytes;
    timingSafeEqual: typeof timingSafeEqual;
  };
  export default nacl;
}
