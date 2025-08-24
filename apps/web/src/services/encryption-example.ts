/**
 * Example usage of the encryption service
 * This file demonstrates how to use the client-side encryption service
 */

import { encryptData, decryptData, DecryptionParams } from "./encryption";

// Example usage function
export async function encryptionExample() {
  const sensitiveData = JSON.stringify({
    username: "user@example.com",
    password: "mySecretPassword123!",
    notes: "This is sensitive information that needs to be encrypted",
    apiKey: "sk-1234567890abcdef",
  });

  const userPassword = "userMasterPassword123!";

  try {
    // Encrypt the data
    console.log("Encrypting sensitive data...");
    const encrypted = await encryptData(sensitiveData, userPassword);

    console.log("Encryption result:", {
      algorithm: encrypted.algorithm,
      encryptedDataLength: encrypted.encryptedData.length,
      ivLength: encrypted.iv.length,
      saltLength: encrypted.salt.length,
    });

    // Decrypt the data
    console.log("Decrypting data...");
    const decryptionParams: DecryptionParams = {
      encryptedData: encrypted.encryptedData,
      iv: encrypted.iv,
      salt: encrypted.salt,
      password: userPassword,
    };

    const decrypted = await decryptData(decryptionParams);
    const parsedData = JSON.parse(decrypted);

    console.log("Decryption successful!");
    console.log(
      "Original data matches:",
      JSON.stringify(parsedData) === sensitiveData,
    );

    return {
      original: sensitiveData,
      encrypted: encrypted,
      decrypted: decrypted,
      matches: JSON.stringify(parsedData) === sensitiveData,
    };
  } catch (error) {
    console.error("Encryption/Decryption failed:", error);
    throw error;
  }
}

// Example of handling different data types
export async function encryptDifferentDataTypes() {
  const userPassword = "testPassword123!";

  const examples = [
    { name: "Simple text", data: "Hello, World!" },
    { name: "Empty string", data: "" },
    {
      name: "Unicode text",
      data: "🔐 Encrypted émojis and spëcial chars 中文",
    },
    { name: "JSON object", data: JSON.stringify({ key: "value", number: 42 }) },
    { name: "Large text", data: "A".repeat(1000) },
  ];

  const results = [];

  for (const example of examples) {
    try {
      const encrypted = await encryptData(example.data, userPassword);
      const decrypted = await decryptData({
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        salt: encrypted.salt,
        password: userPassword,
      });

      results.push({
        name: example.name,
        success: decrypted === example.data,
        originalLength: example.data.length,
        encryptedLength: encrypted.encryptedData.length,
      });
    } catch (error) {
      results.push({
        name: example.name,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

// Example of error handling
export async function encryptionErrorHandling() {
  const validData = "Test data";
  const validPassword = "testPassword123!";

  const errorCases = [
    {
      name: "Invalid data (null)",
      test: () => encryptData(null as any, validPassword),
    },
    {
      name: "Invalid password (too short)",
      test: () => encryptData(validData, "123"),
    },
    {
      name: "Wrong decryption password",
      test: async () => {
        const encrypted = await encryptData(validData, validPassword);
        return decryptData({
          encryptedData: encrypted.encryptedData,
          iv: encrypted.iv,
          salt: encrypted.salt,
          password: "wrongPassword123!",
        });
      },
    },
    {
      name: "Tampered encrypted data",
      test: async () => {
        const encrypted = await encryptData(validData, validPassword);
        return decryptData({
          encryptedData: encrypted.encryptedData + "tampered",
          iv: encrypted.iv,
          salt: encrypted.salt,
          password: validPassword,
        });
      },
    },
  ];

  const results = [];

  for (const errorCase of errorCases) {
    try {
      await errorCase.test();
      results.push({
        name: errorCase.name,
        threwError: false,
        error: "No error thrown (unexpected)",
      });
    } catch (error) {
      results.push({
        name: errorCase.name,
        threwError: true,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}
