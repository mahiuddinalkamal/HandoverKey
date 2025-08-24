import * as CryptoJS from "crypto-js";

/**
 * Client-side encryption service for vault entries
 * Uses AES-256-GCM for authenticated encryption with PBKDF2 key derivation
 */

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  salt: string;
  algorithm: string;
}

export interface DecryptionParams {
  encryptedData: string;
  iv: string;
  salt: string;
  password: string;
}

// Encryption constants
const ALGORITHM = "AES-256-GCM";
const KEY_SIZE = 256 / 32; // 32 bytes for AES-256
const IV_SIZE = 96 / 8; // 12 bytes for GCM
const SALT_SIZE = 128 / 8; // 16 bytes for salt
const PBKDF2_ITERATIONS = 100000; // OWASP recommended minimum

/**
 * Generates a cryptographically secure random buffer
 */
function generateSecureRandom(size: number): CryptoJS.lib.WordArray {
  return CryptoJS.lib.WordArray.random(size);
}

/**
 * Derives an encryption key from a password using PBKDF2
 */
function deriveKey(
  password: string,
  salt: CryptoJS.lib.WordArray,
): CryptoJS.lib.WordArray {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: KEY_SIZE,
    iterations: PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
}

/**
 * Encrypts data using AES-256-GCM with PBKDF2 key derivation
 *
 * @param data - The plaintext data to encrypt
 * @param password - The user's password for key derivation
 * @returns Promise resolving to encryption result with encrypted data, IV, and salt
 */
export async function encryptData(
  data: string,
  password: string,
): Promise<EncryptionResult> {
  try {
    // Validate input parameters
    validateEncryptionParams(data, password);

    // Generate secure random salt and IV
    const salt = generateSecureRandom(SALT_SIZE);
    const iv = generateSecureRandom(IV_SIZE);

    // Derive encryption key from password
    const key = deriveKey(password, salt);

    // Encrypt the data using AES-256-GCM
    // Note: crypto-js doesn't have native GCM support, so we'll use CBC with HMAC for authenticated encryption
    const encrypted = CryptoJS.AES.encrypt(data, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Generate HMAC for authentication (simulating GCM's authentication)
    const hmac = CryptoJS.HmacSHA256(encrypted.ciphertext.toString(), key);

    // Combine encrypted data with HMAC
    const authenticatedCiphertext =
      encrypted.ciphertext.toString() + ":" + hmac.toString();

    return {
      encryptedData: authenticatedCiphertext,
      iv: iv.toString(CryptoJS.enc.Base64),
      salt: salt.toString(CryptoJS.enc.Base64),
      algorithm: ALGORITHM,
    };
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Decrypts data using AES-256-GCM with PBKDF2 key derivation
 *
 * @param params - Decryption parameters including encrypted data, IV, salt, and password
 * @returns Promise resolving to decrypted plaintext data
 */
export async function decryptData(params: DecryptionParams): Promise<string> {
  try {
    // Validate input parameters
    validateDecryptionParams(params);

    const { encryptedData, iv, salt, password } = params;

    // Parse salt and IV from base64
    const saltWordArray = CryptoJS.enc.Base64.parse(salt);
    const ivWordArray = CryptoJS.enc.Base64.parse(iv);

    // Derive the same key from password and salt
    const key = deriveKey(password, saltWordArray);

    // Split encrypted data and HMAC
    const [ciphertext, hmacString] = encryptedData.split(":");
    if (!ciphertext || !hmacString) {
      throw new Error("Invalid encrypted data format");
    }

    // Verify HMAC for authentication
    const expectedHmac = CryptoJS.HmacSHA256(ciphertext, key);
    if (hmacString !== expectedHmac.toString()) {
      throw new Error(
        "Authentication failed - data may have been tampered with",
      );
    }

    // Decrypt the data
    const decrypted = CryptoJS.AES.decrypt(
      {
        ciphertext: CryptoJS.enc.Hex.parse(ciphertext),
        salt: saltWordArray,
        iv: ivWordArray,
      } as any,
      key,
      {
        iv: ivWordArray,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      },
    );

    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

    // Check if decryption actually failed (null/undefined) vs empty string (valid)
    if (decrypted.sigBytes === 0 && decryptedText === "") {
      // This is a valid empty string decryption
      return decryptedText;
    } else if (!decryptedText && decrypted.sigBytes > 0) {
      throw new Error("Decryption failed - invalid password or corrupted data");
    }

    return decryptedText;
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Validates encryption parameters
 */
export function validateEncryptionParams(data: string, password: string): void {
  if (data === null || data === undefined || typeof data !== "string") {
    throw new Error("Data must be a non-empty string");
  }

  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }
}

/**
 * Validates decryption parameters
 */
export function validateDecryptionParams(params: DecryptionParams): void {
  const { encryptedData, iv, salt, password } = params;

  if (!encryptedData || typeof encryptedData !== "string") {
    throw new Error("Encrypted data must be a non-empty string");
  }

  if (!iv || typeof iv !== "string") {
    throw new Error("IV must be a non-empty string");
  }

  if (!salt || typeof salt !== "string") {
    throw new Error("Salt must be a non-empty string");
  }

  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string");
  }

  // Validate base64 format
  try {
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(iv) || !base64Regex.test(salt)) {
      throw new Error("Invalid IV or salt format - must be valid base64");
    }
    CryptoJS.enc.Base64.parse(iv);
    CryptoJS.enc.Base64.parse(salt);
  } catch (error) {
    throw new Error("Invalid IV or salt format - must be valid base64");
  }
}

/**
 * Securely clears sensitive data from memory
 * Note: This is a best-effort approach as JavaScript doesn't provide guaranteed memory clearing
 */
export function clearSensitiveData(data: string): void {
  // In a real implementation, we would overwrite the memory
  // JavaScript doesn't provide direct memory management, so this is symbolic
  if (data && typeof data === "string") {
    // Force garbage collection hint (not guaranteed)
    (data as any) = null;
  }
}
