import { readFileSync } from "fs";
import { join } from "path";
import { DatabaseConnection } from "./connection";

const MIGRATION_FILES = [
  "users.sql",
  "successors.sql",
  "vault.sql",
  "activity.sql",
  "handover.sql",
];

async function runMigrations(): Promise<void> {
  try {
    console.log("Starting database migrations...");

    DatabaseConnection.initialize();

    const isConnected = await DatabaseConnection.testConnection();
    if (!isConnected) {
      throw new Error("Failed to connect to database");
    }

    console.log("Database connection established");

    // Ensure the migrations table exists before proceeding
    const createMigrationsTableSQL = readFileSync(
      join(__dirname, "schema", "migrations_table.sql"),
      "utf8",
    );
    await DatabaseConnection.query(createMigrationsTableSQL);
    console.log("✓ Ensured migrations table exists");

    for (const migrationFile of MIGRATION_FILES) {
      if (migrationFile === "migrations_table.sql") {
        continue; // Skip the migrations_table.sql as it's handled separately
      }

      const result = await DatabaseConnection.query(
        `SELECT id FROM migrations WHERE name = $1`,
        [migrationFile],
      );
      const rows = result.rows;
      if (rows && rows.length > 0) {
        console.log(`Skipping migration: ${migrationFile} (already applied)`);
        continue;
      }

      console.log(`Running migration: ${migrationFile}`);

      const migrationPath = join(__dirname, "schema", migrationFile);
      const migrationSQL = readFileSync(migrationPath, "utf8");

      await DatabaseConnection.query(migrationSQL);
      await DatabaseConnection.query(
        `INSERT INTO migrations (name) VALUES ($1)`,
        [migrationFile],
      );
      console.log(`✓ Completed migration: ${migrationFile}`);
    }

    console.log("All migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await DatabaseConnection.close();
  }
}

if (require.main === module) {
  runMigrations();
}
