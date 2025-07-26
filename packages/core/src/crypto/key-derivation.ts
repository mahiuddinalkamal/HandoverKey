import { KeyDerivationParams, MasterKey } from '@handoverkey/shared';

export class KeyDerivation {
  private static readonly DEFAULT_ITERATIONS = 100000;
  private static readonly DEFAULT_KEY_LENGTH = 256;
  private static readonly DEFAULT_HASH = 'SHA-256';

  static async deriveMasterKey(
    password: string,
    salt?: Uint8Array,
    iterations: number = this.DEFAULT_ITERATIONS
  ): Promise<MasterKey> {
    const finalSalt = salt || crypto.getRandomValues(new Uint8Array(16));
    
    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: finalSalt,
        iterations,
        hash: this.DEFAULT_HASH
      },
      baseKey,
      this.DEFAULT_KEY_LENGTH
    );

    const masterKey = await crypto.subtle.importKey(
      'raw',
      derivedBits,
      'AES-GCM',
      false,
      ['encrypt', 'decrypt']
    );

    return {
      key: masterKey,
      salt: finalSalt,
      iterations
    };
  }

  static async deriveKeyFromMaster(
    masterKey: CryptoKey,
    purpose: string,
    salt?: Uint8Array
  ): Promise<CryptoKey> {
    const purposeSalt = salt || crypto.getRandomValues(new Uint8Array(16));
    const purposeData = new TextEncoder().encode(purpose);
    
    const purposeKey = await crypto.subtle.importKey(
      'raw',
      purposeData,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: purposeSalt,
        iterations: 1000,
        hash: 'SHA-256'
      },
      purposeKey,
      256
    );

    return crypto.subtle.importKey(
      'raw',
      derivedBits,
      'AES-GCM',
      false,
      ['encrypt', 'decrypt']
    );
  }

  static getKeyDerivationParams(): KeyDerivationParams {
    return {
      salt: crypto.getRandomValues(new Uint8Array(16)),
      iterations: this.DEFAULT_ITERATIONS,
      hash: this.DEFAULT_HASH,
      keyLength: this.DEFAULT_KEY_LENGTH
    };
  }
} 