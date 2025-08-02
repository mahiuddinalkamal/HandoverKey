import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { Encryption } from "@handoverkey/core";

export class PasswordUtils {
  private static readonly SALT_ROUNDS = parseInt(
    process.env.BCRYPT_ROUNDS || "12",
  );

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 12) {
      errors.push("Password must be at least 12 characters long");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static generateSecurePassword(): string {
    const length = 16;
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
    let password = "";

    // Use cryptographically secure random bytes instead of Math.random()

    // Use rejection sampling to avoid modulo bias
    for (let i = 0; i < length; i++) {
      let randomIndex: number;

      do {
        // Generate a fresh random byte for each character to avoid bias
        const singleByte = randomBytes(1);
        randomIndex = singleByte[0];
      } while (
        randomIndex >=
        Math.floor(256 / charset.length) * charset.length
      );

      password += charset[randomIndex % charset.length];
    }

    return password;
  }

  static async generateVerificationToken(): Promise<string> {
    const randomBytes = Encryption.generateRandomBytes(32);
    return Buffer.from(randomBytes).toString("base64url");
  }

  static async hashVerificationToken(token: string): Promise<string> {
    return Encryption.hash(token);
  }
}
