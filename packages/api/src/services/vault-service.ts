import { DatabaseConnection } from "@handoverkey/database";
import { VaultEntry, EncryptedData } from "@handoverkey/shared";
import { v4 as uuidv4 } from "uuid";

export interface VaultFilters {
  category?: string;
  tag?: string;
  search?: string;
}

export class VaultService {
  static async createEntry(
    userId: string,
    encryptedData: EncryptedData,
    category?: string,
    tags?: string[],
  ): Promise<VaultEntry> {
    const id = uuidv4();

    const query = `
      INSERT INTO vault_entries (id, user_id, encrypted_data, iv, algorithm, category, tags, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;

    const result = await DatabaseConnection.query(query, [
      id,
      userId,
      encryptedData.data,
      encryptedData.iv,
      encryptedData.algorithm,
      category,
      tags,
    ]);

    const row = result.rows[0];
    return this.mapRowToVaultEntry(row);
  }

  static async getUserEntries(
    userId: string,
    filters: VaultFilters = {},
  ): Promise<VaultEntry[]> {
    let query = "SELECT * FROM vault_entries WHERE user_id = $1";
    const params: any[] = [userId];
    let paramCount = 1;

    if (filters.category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(filters.category);
    }

    if (filters.tag) {
      paramCount++;
      query += ` AND $${paramCount} = ANY(tags)`;
      params.push(filters.tag);
    }

    query += " ORDER BY created_at DESC";

    const result = await DatabaseConnection.query(query, params);
    return result.rows.map(this.mapRowToVaultEntry);
  }

  static async getEntry(
    userId: string,
    entryId: string,
  ): Promise<VaultEntry | null> {
    const query = "SELECT * FROM vault_entries WHERE id = $1 AND user_id = $2";
    const result = await DatabaseConnection.query(query, [entryId, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToVaultEntry(result.rows[0]);
  }

  static async updateEntry(
    userId: string,
    entryId: string,
    encryptedData: EncryptedData,
    category?: string,
    tags?: string[],
  ): Promise<VaultEntry | null> {
    const query = `
      UPDATE vault_entries 
      SET encrypted_data = $3, iv = $4, algorithm = $5, category = $6, tags = $7, 
          version = version + 1, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await DatabaseConnection.query(query, [
      entryId,
      userId,
      encryptedData.data,
      encryptedData.iv,
      encryptedData.algorithm,
      category,
      tags,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToVaultEntry(result.rows[0]);
  }

  static async deleteEntry(userId: string, entryId: string): Promise<boolean> {
    const query = "DELETE FROM vault_entries WHERE id = $1 AND user_id = $2";
    const result = await DatabaseConnection.query(query, [entryId, userId]);

    return result.rowCount > 0;
  }

  static async getEntriesByCategory(
    userId: string,
    category: string,
  ): Promise<VaultEntry[]> {
    const query =
      "SELECT * FROM vault_entries WHERE user_id = $1 AND category = $2 ORDER BY created_at DESC";
    const result = await DatabaseConnection.query(query, [userId, category]);

    return result.rows.map(this.mapRowToVaultEntry);
  }

  static async getEntriesByTag(
    userId: string,
    tag: string,
  ): Promise<VaultEntry[]> {
    const query =
      "SELECT * FROM vault_entries WHERE user_id = $1 AND $2 = ANY(tags) ORDER BY created_at DESC";
    const result = await DatabaseConnection.query(query, [userId, tag]);

    return result.rows.map(this.mapRowToVaultEntry);
  }

  static async getUserCategories(userId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT category 
      FROM vault_entries 
      WHERE user_id = $1 AND category IS NOT NULL 
      ORDER BY category
    `;
    const result = await DatabaseConnection.query(query, [userId]);

    return result.rows.map((row: any) => row.category);
  }

  static async getUserTags(userId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT unnest(tags) as tag 
      FROM vault_entries 
      WHERE user_id = $1 AND tags IS NOT NULL 
      ORDER BY tag
    `;
    const result = await DatabaseConnection.query(query, [userId]);

    return result.rows.map((row: any) => row.tag);
  }

  static async getEntryCount(userId: string): Promise<number> {
    const query =
      "SELECT COUNT(*) as count FROM vault_entries WHERE user_id = $1";
    const result = await DatabaseConnection.query(query, [userId]);

    return parseInt(result.rows[0].count);
  }

  private static mapRowToVaultEntry(row: any): VaultEntry {
    return {
      id: row.id,
      userId: row.user_id,
      encryptedData: {
        data: row.encrypted_data,
        iv: row.iv,
        algorithm: row.algorithm,
      },
      category: row.category,
      tags: row.tags,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
