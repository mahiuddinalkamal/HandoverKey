import { VaultEncryptionService } from "../vault-encryption";
import { vaultApi, VaultEntry } from "../vault";
import * as encryptionService from "../encryption";

// Mock the vault API
jest.mock("../vault", () => ({
  vaultApi: {
    createEntry: jest.fn(),
    getEntry: jest.fn(),
    getEntries: jest.fn(),
    updateEntry: jest.fn(),
    deleteEntry: jest.fn(),
  },
}));

// Mock the encryption service
jest.mock("../encryption");

describe("VaultEncryptionService", () => {
  let service: VaultEncryptionService;
  const mockVaultApi = vaultApi as jest.Mocked<typeof vaultApi>;
  const mockEncryptionService = encryptionService as jest.Mocked<
    typeof encryptionService
  >;

  const testPassword = "testPassword123!";
  const testData = "This is sensitive test data";
  const testEntry = {
    data: testData,
    category: "passwords",
    tags: ["work", "email"],
  };

  const mockEncryptedResult = {
    encryptedData: "mockEncryptedData",
    iv: "mockIV",
    salt: "mockSalt",
    algorithm: "AES-256-GCM",
  };

  const mockVaultEntry: VaultEntry = {
    id: "test-id",
    encryptedData: "mockSalt:mockEncryptedData",
    iv: "mockIV",
    algorithm: "AES-256-GCM",
    category: "passwords",
    tags: ["work", "email"],
    version: 1,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    service = new VaultEncryptionService();
    jest.clearAllMocks();
  });

  describe("createEntry", () => {
    it("should encrypt data and create vault entry", async () => {
      mockEncryptionService.encryptData.mockResolvedValue(mockEncryptedResult);
      mockVaultApi.createEntry.mockResolvedValue(mockVaultEntry);

      const result = await service.createEntry(testEntry, testPassword);

      expect(mockEncryptionService.encryptData).toHaveBeenCalledWith(
        testData,
        testPassword,
      );
      expect(mockVaultApi.createEntry).toHaveBeenCalledWith({
        encryptedData: "mockSalt:mockEncryptedData",
        iv: "mockIV",
        algorithm: "AES-256-GCM",
        category: "passwords",
        tags: ["work", "email"],
      });
      expect(result).toBe(mockVaultEntry);
    });

    it("should handle encryption errors", async () => {
      mockEncryptionService.encryptData.mockRejectedValue(
        new Error("Encryption failed"),
      );

      await expect(
        service.createEntry(testEntry, testPassword),
      ).rejects.toThrow(
        "Failed to create encrypted vault entry: Encryption failed",
      );
    });

    it("should handle vault API errors", async () => {
      mockEncryptionService.encryptData.mockResolvedValue(mockEncryptedResult);
      mockVaultApi.createEntry.mockRejectedValue(new Error("API error"));

      await expect(
        service.createEntry(testEntry, testPassword),
      ).rejects.toThrow("Failed to create encrypted vault entry: API error");
    });
  });

  describe("getDecryptedEntry", () => {
    it("should retrieve and decrypt vault entry", async () => {
      mockVaultApi.getEntry.mockResolvedValue(mockVaultEntry);
      mockEncryptionService.decryptData.mockResolvedValue(testData);

      const result = await service.getDecryptedEntry("test-id", testPassword);

      expect(mockVaultApi.getEntry).toHaveBeenCalledWith("test-id");
      expect(mockEncryptionService.decryptData).toHaveBeenCalledWith({
        encryptedData: "mockEncryptedData",
        iv: "mockIV",
        salt: "mockSalt",
        password: testPassword,
      });
      expect(result).toEqual({
        ...mockVaultEntry,
        decryptedData: testData,
      });
    });

    it("should handle decryption errors", async () => {
      mockVaultApi.getEntry.mockResolvedValue(mockVaultEntry);
      mockEncryptionService.decryptData.mockRejectedValue(
        new Error("Decryption failed"),
      );

      await expect(
        service.getDecryptedEntry("test-id", testPassword),
      ).rejects.toThrow(
        "Failed to decrypt vault entry: Failed to decrypt entry data: Decryption failed",
      );
    });

    it("should handle invalid encrypted data format", async () => {
      const invalidEntry = {
        ...mockVaultEntry,
        encryptedData: "invalidformat",
      };
      mockVaultApi.getEntry.mockResolvedValue(invalidEntry);

      await expect(
        service.getDecryptedEntry("test-id", testPassword),
      ).rejects.toThrow(
        "Failed to decrypt vault entry: Failed to decrypt entry data: Invalid encrypted data format",
      );
    });
  });

  describe("getEntries", () => {
    it("should retrieve vault entries without decryption", async () => {
      const mockEntries = [mockVaultEntry];
      mockVaultApi.getEntries.mockResolvedValue(mockEntries);

      const result = await service.getEntries();

      expect(mockVaultApi.getEntries).toHaveBeenCalledWith(undefined);
      expect(result).toBe(mockEntries);
    });

    it("should pass filters to vault API", async () => {
      const filters = { category: "passwords", tag: "work" };
      mockVaultApi.getEntries.mockResolvedValue([]);

      await service.getEntries(filters);

      expect(mockVaultApi.getEntries).toHaveBeenCalledWith(filters);
    });
  });

  describe("getDecryptedEntries", () => {
    it("should retrieve and decrypt all vault entries", async () => {
      const mockEntries = [mockVaultEntry];
      mockVaultApi.getEntries.mockResolvedValue(mockEntries);
      mockEncryptionService.decryptData.mockResolvedValue(testData);

      const result = await service.getDecryptedEntries(testPassword);

      expect(mockVaultApi.getEntries).toHaveBeenCalledWith(undefined);
      expect(mockEncryptionService.decryptData).toHaveBeenCalledWith({
        encryptedData: "mockEncryptedData",
        iv: "mockIV",
        salt: "mockSalt",
        password: testPassword,
      });
      expect(result).toEqual([
        {
          ...mockVaultEntry,
          decryptedData: testData,
        },
      ]);
    });

    it("should handle individual entry decryption failures gracefully", async () => {
      const mockEntries = [mockVaultEntry];
      mockVaultApi.getEntries.mockResolvedValue(mockEntries);
      mockEncryptionService.decryptData.mockRejectedValue(
        new Error("Wrong password"),
      );

      const result = await service.getDecryptedEntries(testPassword);

      expect(result).toEqual([
        {
          ...mockVaultEntry,
          decryptedData:
            "[Decryption failed: Failed to decrypt entry data: Wrong password]",
        },
      ]);
    });

    it("should pass filters to vault API", async () => {
      const filters = { category: "passwords" };
      mockVaultApi.getEntries.mockResolvedValue([]);

      await service.getDecryptedEntries(testPassword, filters);

      expect(mockVaultApi.getEntries).toHaveBeenCalledWith(filters);
    });
  });

  describe("updateEntry", () => {
    it("should encrypt new data and update vault entry", async () => {
      mockEncryptionService.encryptData.mockResolvedValue(mockEncryptedResult);
      mockVaultApi.updateEntry.mockResolvedValue(mockVaultEntry);

      const result = await service.updateEntry(
        "test-id",
        testEntry,
        testPassword,
      );

      expect(mockEncryptionService.encryptData).toHaveBeenCalledWith(
        testData,
        testPassword,
      );
      expect(mockVaultApi.updateEntry).toHaveBeenCalledWith("test-id", {
        encryptedData: "mockSalt:mockEncryptedData",
        iv: "mockIV",
        algorithm: "AES-256-GCM",
        category: "passwords",
        tags: ["work", "email"],
      });
      expect(result).toBe(mockVaultEntry);
    });

    it("should handle encryption errors", async () => {
      mockEncryptionService.encryptData.mockRejectedValue(
        new Error("Encryption failed"),
      );

      await expect(
        service.updateEntry("test-id", testEntry, testPassword),
      ).rejects.toThrow(
        "Failed to update encrypted vault entry: Encryption failed",
      );
    });
  });

  describe("deleteEntry", () => {
    it("should delete vault entry", async () => {
      mockVaultApi.deleteEntry.mockResolvedValue(undefined);

      await service.deleteEntry("test-id");

      expect(mockVaultApi.deleteEntry).toHaveBeenCalledWith("test-id");
    });

    it("should handle deletion errors", async () => {
      mockVaultApi.deleteEntry.mockRejectedValue(new Error("Delete failed"));

      await expect(service.deleteEntry("test-id")).rejects.toThrow(
        "Failed to delete vault entry: Delete failed",
      );
    });
  });

  describe("validatePassword", () => {
    it("should return true for correct password", async () => {
      mockEncryptionService.decryptData.mockResolvedValue(testData);

      const result = await service.validatePassword(
        mockVaultEntry,
        testPassword,
      );

      expect(result).toBe(true);
      expect(mockEncryptionService.decryptData).toHaveBeenCalledWith({
        encryptedData: "mockEncryptedData",
        iv: "mockIV",
        salt: "mockSalt",
        password: testPassword,
      });
    });

    it("should return false for incorrect password", async () => {
      mockEncryptionService.decryptData.mockRejectedValue(
        new Error("Wrong password"),
      );

      const result = await service.validatePassword(
        mockVaultEntry,
        "wrongPassword",
      );

      expect(result).toBe(false);
    });

    it("should return false for invalid entry format", async () => {
      const invalidEntry = {
        ...mockVaultEntry,
        encryptedData: "invalidformat",
      };

      const result = await service.validatePassword(invalidEntry, testPassword);

      expect(result).toBe(false);
    });
  });
});
