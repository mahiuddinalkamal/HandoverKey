import { VaultEntry, EncryptedData } from '@handoverkey/shared';
import { Encryption } from './encryption';
import { v4 as uuidv4 } from 'uuid';

export class VaultManager {
  static async createEntry(
    userId: string,
    data: string | Uint8Array,
    key: CryptoKey,
    category?: string,
    tags?: string[]
  ): Promise<VaultEntry> {
    const encryptedData = await Encryption.encrypt(data, key);
    
    const entry: VaultEntry = {
      id: uuidv4(),
      userId,
      encryptedData,
      category,
      tags,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return entry;
  }

  static async updateEntry(
    entry: VaultEntry,
    newData: string | Uint8Array,
    key: CryptoKey,
    category?: string,
    tags?: string[]
  ): Promise<VaultEntry> {
    const encryptedData = await Encryption.encrypt(newData, key);
    
    return {
      ...entry,
      encryptedData,
      category: category ?? entry.category,
      tags: tags ?? entry.tags,
      version: entry.version + 1,
      updatedAt: new Date()
    };
  }

  static async decryptEntry(
    entry: VaultEntry,
    key: CryptoKey
  ): Promise<string> {
    return Encryption.decrypt(entry.encryptedData, key);
  }

  static async decryptFileEntry(
    entry: VaultEntry,
    key: CryptoKey
  ): Promise<Uint8Array> {
    return Encryption.decryptFile(entry.encryptedData, key);
  }

  static async searchEntries(
    entries: VaultEntry[],
    query: string,
    key: CryptoKey
  ): Promise<VaultEntry[]> {
    const results: VaultEntry[] = [];
    const lowerQuery = query.toLowerCase();

    for (const entry of entries) {
      try {
        const decryptedData = await this.decryptEntry(entry, key);
        
        if (decryptedData.toLowerCase().includes(lowerQuery) ||
            entry.category?.toLowerCase().includes(lowerQuery) ||
            entry.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))) {
          results.push(entry);
        }
      } catch (error) {
        console.warn(`Failed to decrypt entry ${entry.id}:`, error);
      }
    }

    return results;
  }

  static async exportEntry(
    entry: VaultEntry,
    key: CryptoKey
  ): Promise<{
    id: string;
    data: string;
    category?: string;
    tags?: string[];
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const decryptedData = await this.decryptEntry(entry, key);
    
    return {
      id: entry.id,
      data: decryptedData,
      category: entry.category,
      tags: entry.tags,
      version: entry.version,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    };
  }

  static async importEntry(
    userId: string,
    exportedData: {
      data: string;
      category?: string;
      tags?: string[];
    },
    key: CryptoKey
  ): Promise<VaultEntry> {
    return this.createEntry(
      userId,
      exportedData.data,
      key,
      exportedData.category,
      exportedData.tags
    );
  }

  static getEntriesByCategory(
    entries: VaultEntry[],
    category: string
  ): VaultEntry[] {
    return entries.filter(entry => entry.category === category);
  }

  static getEntriesByTag(
    entries: VaultEntry[],
    tag: string
  ): VaultEntry[] {
    return entries.filter(entry => 
      entry.tags?.some(t => t === tag)
    );
  }

  static getCategories(entries: VaultEntry[]): string[] {
    const categories = new Set<string>();
    entries.forEach(entry => {
      if (entry.category) {
        categories.add(entry.category);
      }
    });
    return Array.from(categories).sort();
  }

  static getTags(entries: VaultEntry[]): string[] {
    const tags = new Set<string>();
    entries.forEach(entry => {
      entry.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }

  static validateEntry(entry: VaultEntry): boolean {
    return !!(
      entry.id &&
      entry.userId &&
      entry.encryptedData &&
      entry.encryptedData.data &&
      entry.encryptedData.iv &&
      entry.encryptedData.algorithm &&
      entry.version > 0 &&
      entry.createdAt &&
      entry.updatedAt
    );
  }
} 