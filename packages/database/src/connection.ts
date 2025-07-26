import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export class DatabaseConnection {
  private static pool: Pool;

  static initialize(): void {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'handoverkey_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  static async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      this.initialize();
    }
    return this.pool.connect();
  }

  static async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getClient();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  static async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }

  static async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW()');
      return !!result.rows[0];
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
} 