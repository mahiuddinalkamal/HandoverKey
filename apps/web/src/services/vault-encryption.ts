/**
 * Vault service with integrated client-side encryption
 * This service combines the vault API with the encryption service
 */

import { vaultApi, VaultEntry, VaultEntryData } from "./vault";
import { encryptData, decryptData, DecryptionParams } from "./encryption";

export interface PlaintextVaultEntry {
  data: string;
  category?: string;
  tags?: string[];
}

export interface DecryptedVaultEntry extends VaultEntry {
  decryptedData: string;
}

/**
 * Enhanced vault service with automatic encryption/decryption
 */
export class VaultEncryptionService {
  /**
   * Creates a new vault entry with client-side encryption
   *
   * @param entry - The plaintext entry data
   * @param password - User's password for encryption
   * @returns Promise resolving to the created vault entry
   */
  async createEntry(
    entry: PlaintextVaultEntry,
    password: string,
  ): Promise<VaultEntry> {
    try {
      // Encrypt the sensitive data
      const encrypted = await encryptData(entry.data, password);

      // Prepare the vault entry data
      const vaultEntryData: VaultEntryData = {
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        algorithm: encrypted.algorithm,
        category: entry.category,
        tags: entry.tags,
      };

      const entryWithSalt: VaultEntryData = {
        ...vaultEntryData,
        encryptedData: `${encrypted.salt}:${encrypted.encryptedData}`,
      };

      return await vaultApi.createEntry(entryWithSalt);
    } catch (error) {
      throw new Error(
        `Failed to create encrypted vault entry: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Retrieves and decrypts a vault entry
   *
   * @param id - The vault entry ID
   * @param password - User's password for decryption
   * @returns Promise resolving to the decrypted vault entry
   */
  async getDecryptedEntry(
    id: string,
    password: string,
  ): Promise<DecryptedVaultEntry> {
    try {
      const entry = await vaultApi.getEntry(id);
      const decryptedData = await this.decryptEntryData(entry, password);

      return {
        ...entry,
        decryptedData,
      };
    } catch (error) {
      throw new Error(
        `Failed to decrypt vault entry: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Retrieves all vault entries (without decryption)
   *
   * @param filters - Optional filters for the entries
   * @returns Promise resolving to array of encrypted vault entries
   */
  async getEntries(filters?: {
    category?: string;
    tag?: string;
    search?: string;
  }): Promise<VaultEntry[]> {
    return await vaultApi.getEntries(filters);
  }

  /**
   * Retrieves and decrypts all vault entries
   *
   * @param password - User's password for decryption
   * @param filters - Optional filters for the entries
   * @returns Promise resolving to array of decrypted vault entries
   */
  async getDecryptedEntries(
    password: string,
    filters?: {
      category?: string;
      tag?: string;
      search?: string;
    },
  ): Promise<DecryptedVaultEntry[]> {
    try {
      const entries = await vaultApi.getEntries(filters);

      // Decrypt all entries in parallel
      const decryptedEntries = await Promise.all(
        entries.map(async (entry) => {
          try {
            const decryptedData = await this.decryptEntryData(entry, password);
            return {
              ...entry,
              decryptedData,
            };
          } catch (error) {
            // If decryption fails for an individual entry, include error info
            return {
              ...entry,
              decryptedData: `[Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}]`,
            };
          }
        }),
      );

      return decryptedEntries;
    } catch (error) {
      throw new Error(
        `Failed to decrypt vault entries: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Updates a vault entry with new encrypted data
   *
   * @param id - The vault entry ID
   * @param entry - The new plaintext entry data
   * @param password - User's password for encryption
   * @returns Promise resolving to the updated vault entry
   */
  async updateEntry(
    id: string,
    entry: PlaintextVaultEntry,
    password: string,
  ): Promise<VaultEntry> {
    try {
      // Encrypt the new data
      const encrypted = await encryptData(entry.data, password);

      // Prepare the vault entry data
      const vaultEntryData: VaultEntryData = {
        encryptedData: `${encrypted.salt}:${encrypted.encryptedData}`,
        iv: encrypted.iv,
        algorithm: encrypted.algorithm,
        category: entry.category,
        tags: entry.tags,
      };

      return await vaultApi.updateEntry(id, vaultEntryData);
    } catch (error) {
      throw new Error(
        `Failed to update encrypted vault entry: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Deletes a vault entry
   *
   * @param id - The vault entry ID
   * @returns Promise resolving when the entry is deleted
   */
  async deleteEntry(id: string): Promise<void> {
    try {
      await vaultApi.deleteEntry(id);
    } catch (error) {
      throw new Error(
        `Failed to delete vault entry: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Decrypts the data from a vault entry
   *
   * @param entry - The encrypted vault entry
   * @param password - User's password for decryption
   * @returns Promise resolving to the decrypted data
   */
  private async decryptEntryData(
    entry: VaultEntry,
    password: string,
  ): Promise<string> {
    try {
      // Parse salt and encrypted data
      const [salt, encryptedData] = entry.encryptedData.split(":", 2);
      if (!salt || !encryptedData) {
        throw new Error("Invalid encrypted data format");
      }

      const decryptionParams: DecryptionParams = {
        encryptedData,
        iv: entry.iv,
        salt,
        password,
      };

      return await decryptData(decryptionParams);
    } catch (error) {
      throw new Error(
        `Failed to decrypt entry data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Validates that a password can decrypt a given entry
   * This is useful for password verification before bulk operations
   *
   * @param entry - A vault entry to test decryption with
   * @param password - The password to test
   * @returns Promise resolving to true if password is correct, false otherwise
   */
  async validatePassword(
    entry: VaultEntry,
    password: string,
  ): Promise<boolean> {
    try {
      await this.decryptEntryData(entry, password);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export a singleton instance
export const vaultEncryptionService = new VaultEncryptionService();
