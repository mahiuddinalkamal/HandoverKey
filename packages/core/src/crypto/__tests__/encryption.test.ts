import { Encryption } from "../encryption";
import { KeyDerivation } from "../key-derivation";

describe("Encryption", () => {
  let testKey: CryptoKey;
  const testData = "This is a test secret message";
  const testObject = { secret: "value", number: 42, array: [1, 2, 3] };

  beforeAll(async () => {
    const masterKey = await KeyDerivation.deriveMasterKey("testPassword123!");
    testKey = masterKey.key;
  });

  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt string data correctly", async () => {
      const encrypted = await Encryption.encrypt(testData, testKey);

      expect(encrypted.data).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.algorithm).toBe("AES-GCM");
      expect(encrypted.data.length).toBeGreaterThan(0);
      expect(encrypted.iv.length).toBe(12);

      const decrypted = await Encryption.decrypt(encrypted, testKey);
      expect(decrypted).toBe(testData);
    });

    it("should encrypt and decrypt Uint8Array data correctly", async () => {
      const testBytes = new TextEncoder().encode(testData);
      const encrypted = await Encryption.encrypt(testBytes, testKey);

      const decrypted = await Encryption.decrypt(encrypted, testKey);
      expect(decrypted).toBe(testData);
    });

    it("should generate different ciphertexts for same plaintext", async () => {
      const encrypted1 = await Encryption.encrypt(testData, testKey);
      const encrypted2 = await Encryption.encrypt(testData, testKey);

      expect(encrypted1.data).not.toEqual(encrypted2.data);
      expect(encrypted1.iv).not.toEqual(encrypted2.iv);
    });

    it("should fail to decrypt with wrong key", async () => {
      const wrongMasterKey =
        await KeyDerivation.deriveMasterKey("wrongPassword");
      const encrypted = await Encryption.encrypt(testData, testKey);

      await expect(
        Encryption.decrypt(encrypted, wrongMasterKey.key),
      ).rejects.toThrow();
    });
  });

  describe("encryptObject and decryptObject", () => {
    it("should encrypt and decrypt objects correctly", async () => {
      const encrypted = await Encryption.encryptObject(testObject, testKey);

      const decrypted = await Encryption.decryptObject(encrypted, testKey);
      expect(decrypted).toEqual(testObject);
    });

    it("should handle complex nested objects", async () => {
      const complexObject = {
        nested: {
          deep: {
            value: "secret",
            array: [1, 2, { key: "value" }],
          },
        },
        timestamp: new Date().toISOString(),
      };

      const encrypted = await Encryption.encryptObject(complexObject, testKey);
      const decrypted = await Encryption.decryptObject(encrypted, testKey);

      expect(decrypted).toEqual(complexObject);
    });
  });

  describe("encryptFile and decryptFile", () => {
    it("should encrypt and decrypt file data correctly", async () => {
      const fileData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const encrypted = await Encryption.encryptFile(fileData, testKey);

      const decrypted = await Encryption.decryptFile(encrypted, testKey);
      expect(decrypted).toEqual(fileData);
    });

    it("should handle large file data", async () => {
      const largeData = new Uint8Array(10000);
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = i % 256;
      }

      const encrypted = await Encryption.encryptFile(largeData, testKey);
      const decrypted = await Encryption.decryptFile(encrypted, testKey);

      expect(decrypted).toEqual(largeData);
    });
  });

  describe("hash", () => {
    it("should generate consistent hashes for same input", async () => {
      const hash1 = await Encryption.hash(testData);
      const hash2 = await Encryption.hash(testData);

      expect(hash1).toBe(hash2);
    });

    it("should generate different hashes for different inputs", async () => {
      const hash1 = await Encryption.hash("data1");
      const hash2 = await Encryption.hash("data2");

      expect(hash1).not.toBe(hash2);
    });

    it("should handle Uint8Array input", async () => {
      const bytes = new TextEncoder().encode(testData);
      const hash1 = await Encryption.hash(testData);
      const hash2 = await Encryption.hash(bytes);

      expect(hash1).toBe(hash2);
    });
  });

  describe("generateRandomBytes", () => {
    it("should generate random bytes of specified length", () => {
      const length = 32;
      const randomBytes = Encryption.generateRandomBytes(length);

      expect(randomBytes.length).toBe(length);
      expect(randomBytes).toBeInstanceOf(Uint8Array);
    });

    it("should generate different random bytes on each call", () => {
      const bytes1 = Encryption.generateRandomBytes(16);
      const bytes2 = Encryption.generateRandomBytes(16);

      expect(bytes1).not.toEqual(bytes2);
    });
  });
});
