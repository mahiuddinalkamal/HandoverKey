import { KeyDerivation } from "../key-derivation";

describe("KeyDerivation", () => {
  const testPassword = "testPassword123!";
  const testSalt = new Uint8Array([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  ]);

  describe("deriveMasterKey", () => {
    it("should derive a master key from password", async () => {
      const masterKey = await KeyDerivation.deriveMasterKey(testPassword);

      expect(masterKey.key).toBeDefined();
      expect(masterKey.salt).toBeDefined();
      expect(masterKey.iterations).toBe(100000);
      expect(masterKey.salt.length).toBe(16);
    });

    it("should use provided salt when given", async () => {
      const masterKey = await KeyDerivation.deriveMasterKey(
        testPassword,
        testSalt,
      );

      expect(masterKey.salt).toEqual(testSalt);
    });

    it("should use custom iterations when provided", async () => {
      const customIterations = 50000;
      const masterKey = await KeyDerivation.deriveMasterKey(
        testPassword,
        undefined,
        customIterations,
      );

      expect(masterKey.iterations).toBe(customIterations);
    });

    it("should generate different keys for different passwords", async () => {
      const key1 = await KeyDerivation.deriveMasterKey("password1");
      const key2 = await KeyDerivation.deriveMasterKey("password2");

      expect(key1.key).toBeDefined();
      expect(key2.key).toBeDefined();
      expect(key1.salt).not.toEqual(key2.salt);
    });

    it("should generate different keys for same password with different salts", async () => {
      const salt1 = new Uint8Array([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
      ]);
      const salt2 = new Uint8Array([
        16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
      ]);

      const key1 = await KeyDerivation.deriveMasterKey(testPassword, salt1);
      const key2 = await KeyDerivation.deriveMasterKey(testPassword, salt2);

      expect(key1.key).toBeDefined();
      expect(key2.key).toBeDefined();
      expect(key1.salt).toEqual(salt1);
      expect(key2.salt).toEqual(salt2);
    });
  });

  describe("deriveKeyFromMaster", () => {
    it("should derive a purpose-specific key from master key", async () => {
      const masterKey = await KeyDerivation.deriveMasterKey(testPassword);
      const purposeKey = await KeyDerivation.deriveKeyFromMaster(
        masterKey.key,
        "vault",
      );

      expect(purposeKey).toBeDefined();
      expect(masterKey.key).toBeDefined();
    });

    it("should generate different keys for different purposes", async () => {
      const masterKey = await KeyDerivation.deriveMasterKey(testPassword);
      const vaultKey = await KeyDerivation.deriveKeyFromMaster(
        masterKey.key,
        "vault",
      );
      const backupKey = await KeyDerivation.deriveKeyFromMaster(
        masterKey.key,
        "backup",
      );

      expect(vaultKey).toBeDefined();
      expect(backupKey).toBeDefined();
    });
  });

  describe("getKeyDerivationParams", () => {
    it("should return valid key derivation parameters", () => {
      const params = KeyDerivation.getKeyDerivationParams();

      expect(params.salt).toBeDefined();
      expect(params.salt.length).toBe(16);
      expect(params.iterations).toBe(100000);
      expect(params.hash).toBe("SHA-256");
      expect(params.keyLength).toBe(256);
    });
  });
});
