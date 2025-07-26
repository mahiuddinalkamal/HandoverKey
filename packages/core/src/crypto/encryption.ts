import { EncryptedData } from '@handoverkey/shared';

export class Encryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly IV_LENGTH = 12;
  private static readonly TAG_LENGTH = 128;

  static async encrypt(
    data: string | Uint8Array,
    key: CryptoKey
  ): Promise<EncryptedData> {
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    const encodedData = typeof data === 'string' 
      ? new TextEncoder().encode(data)
      : data;

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv,
        tagLength: this.TAG_LENGTH
      },
      key,
      encodedData
    );

    return {
      data: new Uint8Array(encryptedData),
      iv,
      algorithm: this.ALGORITHM
    };
  }

  static async decrypt(
    encryptedData: EncryptedData,
    key: CryptoKey
  ): Promise<string> {
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv: encryptedData.iv,
        tagLength: this.TAG_LENGTH
      },
      key,
      encryptedData.data
    );

    return new TextDecoder().decode(decryptedData);
  }

  static async encryptFile(
    file: File | Uint8Array,
    key: CryptoKey
  ): Promise<EncryptedData> {
    const fileData = file instanceof File 
      ? new Uint8Array(await file.arrayBuffer())
      : file;

    return this.encrypt(fileData, key);
  }

  static async decryptFile(
    encryptedData: EncryptedData,
    key: CryptoKey
  ): Promise<Uint8Array> {
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv: encryptedData.iv,
        tagLength: this.TAG_LENGTH
      },
      key,
      encryptedData.data
    );

    return new Uint8Array(decryptedData);
  }

  static async encryptObject<T>(
    obj: T,
    key: CryptoKey
  ): Promise<EncryptedData> {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString, key);
  }

  static async decryptObject<T>(
    encryptedData: EncryptedData,
    key: CryptoKey
  ): Promise<T> {
    const jsonString = await this.decrypt(encryptedData, key);
    return JSON.parse(jsonString) as T;
  }

  static generateRandomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  static async hash(data: string | Uint8Array): Promise<string> {
    const encodedData = typeof data === 'string'
      ? new TextEncoder().encode(data)
      : data;

    const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
} 