import {
  encryptData,
  decryptData,
  validateEncryptionParams,
  validateDecryptionParams,
  clearSensitiveData,
  DecryptionParams,
} from "../encryption";

describe("Encryption Service", () => {
  const testData = "This is sensitive test data that needs to be encrypted";
  const testPassword = "testPassword123!";
  const shortPassword = "123";

  describe("encryptData", () => {
    it("should encrypt data successfully with valid inputs", async () => {
      const result = await encryptData(testData, testPassword);

      expect(result).toHaveProperty("encryptedData");
      expect(result).toHaveProperty("iv");
      expect(result).toHaveProperty("salt");
      expect(result).toHaveProperty("algorithm");

      expect(result.algorithm).toBe("AES-256-GCM");
      expect(result.encryptedData).toBeTruthy();
      expect(result.iv).toBeTruthy();
      expect(result.salt).toBeTruthy();

      // Verify base64 format for IV and salt
      expect(() => atob(result.iv)).not.toThrow();
      expect(() => atob(result.salt)).not.toThrow();
    });

    it("should generate unique IV and salt for each encryption", async () => {
      const result1 = await encryptData(testData, testPassword);
      const result2 = await encryptData(testData, testPassword);

      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.salt).not.toBe(result2.salt);
      expect(result1.encryptedData).not.toBe(result2.encryptedData);
    });

    it("should produce different encrypted data for same input with different passwords", async () => {
      const result1 = await encryptData(testData, testPassword);
      const result2 = await encryptData(testData, "differentPassword123!");

      expect(result1.encryptedData).not.toBe(result2.encryptedData);
    });

    it("should handle empty string data", async () => {
      const result = await encryptData("", testPassword);
      expect(result.encryptedData).toBeTruthy();
    });

    it("should handle unicode characters", async () => {
      const unicodeData =
        "🔐 Encrypted data with émojis and spëcial chars 中文";
      const result = await encryptData(unicodeData, testPassword);
      expect(result.encryptedData).toBeTruthy();
    });

    it("should throw error for invalid data input", async () => {
      await expect(encryptData(null as any, testPassword)).rejects.toThrow();
      await expect(
        encryptData(undefined as any, testPassword),
      ).rejects.toThrow();
      await expect(encryptData(123 as any, testPassword)).rejects.toThrow();
    });

    it("should throw error for invalid password input", async () => {
      await expect(encryptData(testData, null as any)).rejects.toThrow();
      await expect(encryptData(testData, undefined as any)).rejects.toThrow();
      await expect(encryptData(testData, 123 as any)).rejects.toThrow();
    });
  });

  describe("decryptData", () => {
    it("should decrypt data successfully with correct password", async () => {
      const encrypted = await encryptData(testData, testPassword);
      const decryptionParams: DecryptionParams = {
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        salt: encrypted.salt,
        password: testPassword,
      };

      const decrypted = await decryptData(decryptionParams);
      expect(decrypted).toBe(testData);
    });

    it("should handle unicode characters in decryption", async () => {
      const unicodeData =
        "🔐 Encrypted data with émojis and spëcial chars 中文";
      const encrypted = await encryptData(unicodeData, testPassword);
      const decryptionParams: DecryptionParams = {
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        salt: encrypted.salt,
        password: testPassword,
      };

      const decrypted = await decryptData(decryptionParams);
      expect(decrypted).toBe(unicodeData);
    });

    it("should handle empty string decryption", async () => {
      const encrypted = await encryptData("", testPassword);
      const decryptionParams: DecryptionParams = {
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        salt: encrypted.salt,
        password: testPassword,
      };

      const decrypted = await decryptData(decryptionParams);
      expect(decrypted).toBe("");
    });

    it("should throw error with wrong password", async () => {
      const encrypted = await encryptData(testData, testPassword);
      const decryptionParams: DecryptionParams = {
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        salt: encrypted.salt,
        password: "wrongPassword123!",
      };

      await expect(decryptData(decryptionParams)).rejects.toThrow();
    });

    it("should throw error with tampered encrypted data", async () => {
      const encrypted = await encryptData(testData, testPassword);
      const decryptionParams: DecryptionParams = {
        encryptedData: encrypted.encryptedData + "tampered",
        iv: encrypted.iv,
        salt: encrypted.salt,
        password: testPassword,
      };

      await expect(decryptData(decryptionParams)).rejects.toThrow(
        "Authentication failed",
      );
    });

    it("should throw error with invalid IV", async () => {
      const encrypted = await encryptData(testData, testPassword);
      const decryptionParams: DecryptionParams = {
        encryptedData: encrypted.encryptedData,
        iv: "invalidIV",
        salt: encrypted.salt,
        password: testPassword,
      };

      await expect(decryptData(decryptionParams)).rejects.toThrow();
    });

    it("should throw error with invalid salt", async () => {
      const encrypted = await encryptData(testData, testPassword);
      const decryptionParams: DecryptionParams = {
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        salt: "invalidSalt",
        password: testPassword,
      };

      await expect(decryptData(decryptionParams)).rejects.toThrow();
    });

    it("should throw error with malformed encrypted data", async () => {
      const encrypted = await encryptData(testData, testPassword);
      const decryptionParams: DecryptionParams = {
        encryptedData: "malformed:data:format",
        iv: encrypted.iv,
        salt: encrypted.salt,
        password: testPassword,
      };

      await expect(decryptData(decryptionParams)).rejects.toThrow();
    });
  });

  describe("validateEncryptionParams", () => {
    it("should pass validation with valid parameters", () => {
      expect(() =>
        validateEncryptionParams(testData, testPassword),
      ).not.toThrow();
    });

    it("should throw error for invalid data", () => {
      expect(() => validateEncryptionParams(null as any, testPassword)).toThrow(
        "Data must be a non-empty string",
      );
      expect(() =>
        validateEncryptionParams(undefined as any, testPassword),
      ).toThrow("Data must be a non-empty string");
      expect(() => validateEncryptionParams(123 as any, testPassword)).toThrow(
        "Data must be a non-empty string",
      );
    });

    it("should throw error for invalid password", () => {
      expect(() => validateEncryptionParams(testData, "")).toThrow(
        "Password must be a non-empty string",
      );
      expect(() => validateEncryptionParams(testData, null as any)).toThrow(
        "Password must be a non-empty string",
      );
      expect(() =>
        validateEncryptionParams(testData, undefined as any),
      ).toThrow("Password must be a non-empty string");
      expect(() => validateEncryptionParams(testData, 123 as any)).toThrow(
        "Password must be a non-empty string",
      );
    });

    it("should throw error for short password", () => {
      expect(() => validateEncryptionParams(testData, shortPassword)).toThrow(
        "Password must be at least 8 characters long",
      );
    });
  });

  describe("validateDecryptionParams", () => {
    let validParams: DecryptionParams;

    beforeEach(async () => {
      const encrypted = await encryptData(testData, testPassword);
      validParams = {
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        salt: encrypted.salt,
        password: testPassword,
      };
    });

    it("should pass validation with valid parameters", () => {
      expect(() => validateDecryptionParams(validParams)).not.toThrow();
    });

    it("should throw error for invalid encrypted data", () => {
      expect(() =>
        validateDecryptionParams({ ...validParams, encryptedData: "" }),
      ).toThrow("Encrypted data must be a non-empty string");
      expect(() =>
        validateDecryptionParams({
          ...validParams,
          encryptedData: null as any,
        }),
      ).toThrow("Encrypted data must be a non-empty string");
    });

    it("should throw error for invalid IV", () => {
      expect(() =>
        validateDecryptionParams({ ...validParams, iv: "" }),
      ).toThrow("IV must be a non-empty string");
      expect(() =>
        validateDecryptionParams({ ...validParams, iv: "invalidBase64!" }),
      ).toThrow("Invalid IV or salt format");
    });

    it("should throw error for invalid salt", () => {
      expect(() =>
        validateDecryptionParams({ ...validParams, salt: "" }),
      ).toThrow("Salt must be a non-empty string");
      expect(() =>
        validateDecryptionParams({ ...validParams, salt: "invalidBase64!" }),
      ).toThrow("Invalid IV or salt format");
    });

    it("should throw error for invalid password", () => {
      expect(() =>
        validateDecryptionParams({ ...validParams, password: "" }),
      ).toThrow("Password must be a non-empty string");
      expect(() =>
        validateDecryptionParams({ ...validParams, password: null as any }),
      ).toThrow("Password must be a non-empty string");
    });
  });

  describe("clearSensitiveData", () => {
    it("should handle string input without throwing", () => {
      expect(() => clearSensitiveData(testData)).not.toThrow();
    });

    it("should handle null input without throwing", () => {
      expect(() => clearSensitiveData(null as any)).not.toThrow();
    });

    it("should handle undefined input without throwing", () => {
      expect(() => clearSensitiveData(undefined as any)).not.toThrow();
    });
  });

  describe("End-to-End Encryption/Decryption", () => {
    it("should successfully encrypt and decrypt large data", async () => {
      const largeData = "A".repeat(10000); // 10KB of data
      const encrypted = await encryptData(largeData, testPassword);
      const decryptionParams: DecryptionParams = {
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        salt: encrypted.salt,
        password: testPassword,
      };

      const decrypted = await decryptData(decryptionParams);
      expect(decrypted).toBe(largeData);
    });

    it("should handle multiple encrypt/decrypt cycles", async () => {
      let data = testData;

      for (let i = 0; i < 5; i++) {
        const encrypted = await encryptData(data, testPassword);
        const decryptionParams: DecryptionParams = {
          encryptedData: encrypted.encryptedData,
          iv: encrypted.iv,
          salt: encrypted.salt,
          password: testPassword,
        };
        data = await decryptData(decryptionParams);
      }

      expect(data).toBe(testData);
    });

    it("should maintain data integrity with special characters", async () => {
      const specialData = JSON.stringify({
        password: "myP@ssw0rd!",
        notes: "Special chars: <>&\"'",
        unicode: "🔐🗝️🛡️",
        newlines: "Line 1\nLine 2\r\nLine 3",
        tabs: "Col1\tCol2\tCol3",
      });

      const encrypted = await encryptData(specialData, testPassword);
      const decryptionParams: DecryptionParams = {
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        salt: encrypted.salt,
        password: testPassword,
      };

      const decrypted = await decryptData(decryptionParams);
      expect(decrypted).toBe(specialData);

      // Verify JSON can be parsed back
      const parsed = JSON.parse(decrypted);
      expect(parsed.password).toBe("myP@ssw0rd!");
      expect(parsed.unicode).toBe("🔐🗝️🛡️");
    });
  });
});
