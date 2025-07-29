import { DatabaseConnection } from "./connection";
import bcrypt from "bcryptjs";

async function seedDatabase(): Promise<void> {
  try {
    console.log("Starting database seeding...");

    DatabaseConnection.initialize();

    const isConnected = await DatabaseConnection.testConnection();
    if (!isConnected) {
      throw new Error("Failed to connect to database");
    }

    console.log("Database connection established");

    // Check if we're in development mode
    if (process.env.NODE_ENV === "production") {
      console.log("Skipping seed in production environment");
      return;
    }

    // Create a test user for development
    const testEmail = "test@handoverkey.com";
    const testPassword = "TestPassword123!";

    // Check if test user already exists
    const existingUser = await DatabaseConnection.query(
      "SELECT id FROM users WHERE email = $1",
      [testEmail],
    );

    if (existingUser.rows.length > 0) {
      console.log("Test user already exists, skipping seed");
      return;
    }

    // Create test user
    const passwordHash = await bcrypt.hash(testPassword, 12);
    const salt = Buffer.from("test-salt-for-development", "utf8");

    const userResult = await DatabaseConnection.query(
      `
      INSERT INTO users (email, password_hash, salt, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id
    `,
      [testEmail, passwordHash, salt],
    );

    const userId = userResult.rows[0].id;
    console.log(`✓ Created test user: ${testEmail}`);

    // Create a test successor
    await DatabaseConnection.query(
      `
      INSERT INTO successors (user_id, email, name, verified, handover_delay_days, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `,
      [userId, "successor@handoverkey.com", "Test Successor", true, 90],
    );

    console.log("✓ Created test successor");

    // Create some test vault entries (encrypted with a test key)
    const testEntries = [
      {
        encrypted_data: Buffer.from("encrypted-password-data", "utf8"),
        iv: Buffer.from("test-iv-12345", "utf8"),
        algorithm: "AES-GCM",
        category: "Passwords",
        tags: ["social", "facebook"],
      },
      {
        encrypted_data: Buffer.from("encrypted-document-data", "utf8"),
        iv: Buffer.from("test-iv-67890", "utf8"),
        algorithm: "AES-GCM",
        category: "Documents",
        tags: ["legal", "important"],
      },
    ];

    for (const entry of testEntries) {
      await DatabaseConnection.query(
        `
        INSERT INTO vault_entries (user_id, encrypted_data, iv, algorithm, category, tags, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `,
        [
          userId,
          entry.encrypted_data,
          entry.iv,
          entry.algorithm,
          entry.category,
          entry.tags,
        ],
      );
    }

    console.log("✓ Created test vault entries");

    // Create test activity log
    await DatabaseConnection.query(
      `
      INSERT INTO activity_logs (user_id, action, success, created_at)
      VALUES ($1, $2, $3, NOW())
    `,
      [userId, "USER_REGISTERED", true],
    );

    console.log("✓ Created test activity log");

    console.log("Database seeding completed successfully!");
    console.log("");
    console.log("Test credentials:");
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${testPassword}`);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    await DatabaseConnection.close();
  }
}

if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };
