import { DatabaseConnection } from '@handoverkey/database';
import { PasswordUtils } from '../auth/password';
import { User, UserRegistration, UserLogin } from '@handoverkey/shared';

export class UserService {
  static async createUser(registration: UserRegistration): Promise<User> {
    const { email, password } = registration;

    // Validate password strength
    const passwordValidation = PasswordUtils.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if user already exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await PasswordUtils.hashPassword(password);
    const salt = Buffer.from(PasswordUtils.generateSecurePassword(), 'utf8');

    const query = `
      INSERT INTO users (email, password_hash, salt, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
    `;

    const result = await DatabaseConnection.query(query, [email, passwordHash, salt]);
    const user = result.rows[0];

    return {
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      salt: user.salt,
      twoFactorEnabled: user.two_factor_enabled,
      twoFactorSecret: user.two_factor_secret,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }

  static async findUserByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await DatabaseConnection.query(query, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      salt: user.salt,
      twoFactorEnabled: user.two_factor_enabled,
      twoFactorSecret: user.two_factor_secret,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }

  static async findUserById(userId: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await DatabaseConnection.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      salt: user.salt,
      twoFactorEnabled: user.two_factor_enabled,
      twoFactorSecret: user.two_factor_secret,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }

  static async authenticateUser(login: UserLogin): Promise<User | null> {
    const { email, password } = login;

    const user = await this.findUserByEmail(email);
    if (!user) {
      return null;
    }

    const isValidPassword = await PasswordUtils.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return null;
    }

    // Update last login
    await this.updateLastLogin(user.id);

    return user;
  }

  static async updateLastLogin(userId: string): Promise<void> {
    const query = 'UPDATE users SET last_login = NOW() WHERE id = $1';
    await DatabaseConnection.query(query, [userId]);
  }

  static async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const allowedFields = ['twoFactorEnabled', 'twoFactorSecret'];
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        const dbField = key === 'twoFactorEnabled' ? 'two_factor_enabled' : 'two_factor_secret';
        updateFields.push(`${dbField} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push('updated_at = NOW()');
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await DatabaseConnection.query(query, values);
    const user = result.rows[0];

    return {
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      salt: user.salt,
      twoFactorEnabled: user.two_factor_enabled,
      twoFactorSecret: user.two_factor_secret,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }

  static async deleteUser(userId: string): Promise<void> {
    const query = 'DELETE FROM users WHERE id = $1';
    await DatabaseConnection.query(query, [userId]);
  }

  static async logActivity(userId: string, action: string, ipAddress?: string, userAgent?: string, success: boolean = true, metadata?: any): Promise<void> {
    const query = `
      INSERT INTO activity_logs (user_id, action, ip_address, user_agent, success, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `;

    await DatabaseConnection.query(query, [
      userId,
      action,
      ipAddress,
      userAgent,
      success,
      metadata ? JSON.stringify(metadata) : null
    ]);
  }
} 