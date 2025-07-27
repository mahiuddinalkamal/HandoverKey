import { VaultManager } from '../vault';
import { KeyDerivation } from '../key-derivation';
import { VaultEntry } from '@handoverkey/shared';

describe('VaultManager', () => {
  let testKey: CryptoKey;
  const userId = 'test-user-123';
  const testData = 'This is secret vault data';
  const testCategory = 'Passwords';
  const testTags = ['social', 'login'];

  beforeAll(async () => {
    const masterKey = await KeyDerivation.deriveMasterKey('testPassword123!');
    testKey = masterKey.key;
  });

  describe('createEntry', () => {
    it('should create a vault entry with encrypted data', async () => {
      const entry = await VaultManager.createEntry(userId, testData, testKey, testCategory, testTags);

      expect(entry.id).toBeDefined();
      expect(entry.userId).toBe(userId);
      expect(entry.category).toBe(testCategory);
      expect(entry.tags).toEqual(testTags);
      expect(entry.version).toBe(1);
      expect(entry.encryptedData.data).toBeDefined();
      expect(entry.encryptedData.iv).toBeDefined();
      expect(entry.encryptedData.algorithm).toBe('AES-GCM');
      expect(entry.createdAt).toBeInstanceOf(Date);
      expect(entry.updatedAt).toBeInstanceOf(Date);
    });

    it('should create entry without category and tags', async () => {
      const entry = await VaultManager.createEntry(userId, testData, testKey);

      expect(entry.category).toBeUndefined();
      expect(entry.tags).toBeUndefined();
    });

    it('should handle Uint8Array data', async () => {
      const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
      const entry = await VaultManager.createEntry(userId, binaryData, testKey);

      expect(entry.encryptedData.data).toBeDefined();
    });
  });

  describe('updateEntry', () => {
    it('should update entry data and increment version', async () => {
      const originalEntry = await VaultManager.createEntry(userId, testData, testKey, testCategory, testTags);
      const newData = 'Updated secret data';
      const newCategory = 'Documents';
      const newTags = ['legal', 'important'];

      const updatedEntry = await VaultManager.updateEntry(originalEntry, newData, testKey, newCategory, newTags);

      expect(updatedEntry.id).toBe(originalEntry.id);
      expect(updatedEntry.userId).toBe(originalEntry.userId);
      expect(updatedEntry.category).toBe(newCategory);
      expect(updatedEntry.tags).toEqual(newTags);
      expect(updatedEntry.version).toBe(originalEntry.version + 1);
      expect(updatedEntry.updatedAt.getTime()).toBeGreaterThanOrEqual(originalEntry.updatedAt.getTime());

      // Verify the data was actually updated
      const decryptedData = await VaultManager.decryptEntry(updatedEntry, testKey);
      expect(decryptedData).toBe(newData);
    });

    it('should preserve existing category and tags if not provided', async () => {
      const originalEntry = await VaultManager.createEntry(userId, testData, testKey, testCategory, testTags);
      const newData = 'Updated secret data';

      const updatedEntry = await VaultManager.updateEntry(originalEntry, newData, testKey);

      expect(updatedEntry.category).toBe(testCategory);
      expect(updatedEntry.tags).toEqual(testTags);
    });
  });

  describe('decryptEntry', () => {
    it('should decrypt entry data correctly', async () => {
      const entry = await VaultManager.createEntry(userId, testData, testKey);
      const decryptedData = await VaultManager.decryptEntry(entry, testKey);

      expect(decryptedData).toBe(testData);
    });

    it('should fail with wrong key', async () => {
      const entry = await VaultManager.createEntry(userId, testData, testKey);
      const wrongMasterKey = await KeyDerivation.deriveMasterKey('wrongPassword');

      await expect(VaultManager.decryptEntry(entry, wrongMasterKey.key))
        .rejects.toThrow();
    });
  });

  describe('searchEntries', () => {
    let entries: VaultEntry[];

    beforeEach(async () => {
      entries = [
        await VaultManager.createEntry(userId, 'Facebook login credentials', testKey, 'Passwords', ['social', 'facebook']),
        await VaultManager.createEntry(userId, 'Bank account information', testKey, 'Finance', ['bank', 'important']),
        await VaultManager.createEntry(userId, 'Personal documents', testKey, 'Documents', ['legal', 'personal']),
        await VaultManager.createEntry(userId, 'Twitter API keys', testKey, 'API Keys', ['social', 'twitter']),
      ];
    });

    it('should find entries by content', async () => {
      const results = await VaultManager.searchEntries(entries, 'facebook', testKey);
      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('Passwords');
    });

    it('should find entries by category', async () => {
      const results = await VaultManager.searchEntries(entries, 'finance', testKey);
      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('Finance');
    });

    it('should find entries by tags', async () => {
      const results = await VaultManager.searchEntries(entries, 'social', testKey);
      expect(results).toHaveLength(2);
    });

    it('should be case insensitive', async () => {
      const results = await VaultManager.searchEntries(entries, 'BANK', testKey);
      expect(results).toHaveLength(1);
    });

    it('should return empty array for no matches', async () => {
      const results = await VaultManager.searchEntries(entries, 'nonexistent', testKey);
      expect(results).toHaveLength(0);
    });
  });

  describe('exportEntry', () => {
    it('should export entry with decrypted data', async () => {
      const entry = await VaultManager.createEntry(userId, testData, testKey, testCategory, testTags);
      const exported = await VaultManager.exportEntry(entry, testKey);

      expect(exported.id).toBe(entry.id);
      expect(exported.data).toBe(testData);
      expect(exported.category).toBe(testCategory);
      expect(exported.tags).toEqual(testTags);
      expect(exported.version).toBe(entry.version);
      expect(exported.createdAt).toEqual(entry.createdAt);
      expect(exported.updatedAt).toEqual(entry.updatedAt);
    });
  });

  describe('importEntry', () => {
    it('should import entry and encrypt data', async () => {
      const importData = {
        data: testData,
        category: testCategory,
        tags: testTags
      };

      const entry = await VaultManager.importEntry(userId, importData, testKey);

      expect(entry.userId).toBe(userId);
      expect(entry.category).toBe(testCategory);
      expect(entry.tags).toEqual(testTags);

      const decryptedData = await VaultManager.decryptEntry(entry, testKey);
      expect(decryptedData).toBe(testData);
    });
  });

  describe('utility methods', () => {
    let entries: VaultEntry[];

    beforeEach(async () => {
      entries = [
        await VaultManager.createEntry(userId, 'data1', testKey, 'Passwords', ['social', 'work']),
        await VaultManager.createEntry(userId, 'data2', testKey, 'Finance', ['bank']),
        await VaultManager.createEntry(userId, 'data3', testKey, 'Passwords', ['personal']),
        await VaultManager.createEntry(userId, 'data4', testKey, 'Documents', ['legal', 'work']),
      ];
    });

    describe('getEntriesByCategory', () => {
      it('should filter entries by category', () => {
        const passwordEntries = VaultManager.getEntriesByCategory(entries, 'Passwords');
        expect(passwordEntries).toHaveLength(2);
      });
    });

    describe('getEntriesByTag', () => {
      it('should filter entries by tag', () => {
        const workEntries = VaultManager.getEntriesByTag(entries, 'work');
        expect(workEntries).toHaveLength(2);
      });
    });

    describe('getCategories', () => {
      it('should return unique categories sorted', () => {
        const categories = VaultManager.getCategories(entries);
        expect(categories).toEqual(['Documents', 'Finance', 'Passwords']);
      });
    });

    describe('getTags', () => {
      it('should return unique tags sorted', () => {
        const tags = VaultManager.getTags(entries);
        expect(tags).toEqual(['bank', 'legal', 'personal', 'social', 'work']);
      });
    });

    describe('validateEntry', () => {
      it('should validate correct entry', () => {
        const isValid = VaultManager.validateEntry(entries[0]);
        expect(isValid).toBe(true);
      });

      it('should invalidate entry with missing required fields', () => {
        const invalidEntry = { ...entries[0] };
        delete (invalidEntry as any).id;

        const isValid = VaultManager.validateEntry(invalidEntry);
        expect(isValid).toBe(false);
      });
    });
  });
});