export const validateEmail = (email: string): boolean => {
  // Prevent ReDoS attacks by using safe validation instead of vulnerable regex
  if (!email || typeof email !== "string") {
    return false;
  }

  // Basic length check to prevent excessive processing
  if (email.length < 5 || email.length > 254) {
    return false;
  }

  // Safe character-by-character validation
  const atIndex = email.indexOf("@");
  if (atIndex === -1 || atIndex === 0 || atIndex === email.length - 1) {
    return false;
  }

  // Ensure only one @ symbol
  if (email.indexOf("@", atIndex + 1) !== -1) {
    return false;
  }

  const localPart = email.substring(0, atIndex);
  const domainPart = email.substring(atIndex + 1);

  // Validate local part (before @)
  if (localPart.length === 0 || localPart.length > 64) {
    return false;
  }

  // Validate domain part (after @)
  if (domainPart.length === 0 || domainPart.length > 253) {
    return false;
  }

  // Domain must contain at least one dot
  const dotIndex = domainPart.indexOf(".");
  if (dotIndex === -1 || dotIndex === 0 || dotIndex === domainPart.length - 1) {
    return false;
  }

  // Basic character validation (safe, non-backtracking)
  const validEmailChars = /^[a-zA-Z0-9._%+-]+$/;
  const validDomainChars = /^[a-zA-Z0-9.-]+$/;

  return validEmailChars.test(localPart) && validDomainChars.test(domainPart);
};

export const validatePassword = (
  password: string,
): {
  isValid: boolean;
  errors: string[];
} => {
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
};

export const sanitizeInput = (input: any): string => {
  // Handle null, undefined, and non-string inputs first
  if (input === null || input === undefined) {
    return "";
  }

  if (typeof input !== "string") {
    return "";
  }

  // Convert to string and trim
  let result = input.trim();

  // Return empty if only whitespace
  if (result === "") {
    return "";
  }

  // Limit length to prevent DoS attacks
  if (result.length > 10000) {
    result = result.substring(0, 10000);
  }

  // Decode HTML entities first
  result = result
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");

  // Remove HTML tags iteratively to handle nested tags
  let previousLength;
  do {
    previousLength = result.length;
    result = result.replace(/<[^>]*>/g, "");
  } while (result.length !== previousLength && result.length > 0);

  // Remove remaining angle brackets
  result = result.replace(/[<>]/g, "");

  // Remove dangerous protocols iteratively
  const dangerousProtocols = ["javascript:", "vbscript:", "data:"];
  let protocolsFound = true;
  while (protocolsFound) {
    protocolsFound = false;
    for (const protocol of dangerousProtocols) {
      const beforeLength = result.length;
      result = result.replace(new RegExp(protocol, "gi"), "");
      if (result.length !== beforeLength) {
        protocolsFound = true;
      }
    }
  }

  // Remove event handlers iteratively
  const eventHandlers = [
    "onclick",
    "onload",
    "onerror",
    "onmouseover",
    "onmouseout",
    "onfocus",
    "onblur",
  ];
  let handlersFound = true;
  while (handlersFound) {
    handlersFound = false;
    for (const handler of eventHandlers) {
      const beforeLength = result.length;
      result = result.replace(new RegExp(handler + "\\s*=", "gi"), "");
      if (result.length !== beforeLength) {
        handlersFound = true;
      }
    }
  }

  // Remove control characters and null bytes
  // eslint-disable-next-line no-control-regex
  result = result.replace(/[\x00-\x1F\x7F]/g, "");

  return result;
};

export const isValidUUID = (uuid: string): boolean => {
  // Prevent ReDoS attacks by using safe validation instead of vulnerable regex
  if (!uuid || typeof uuid !== "string") {
    return false;
  }

  // UUID must be exactly 36 characters
  if (uuid.length !== 36) {
    return false;
  }

  // Check hyphen positions (safe, constant-time checks)
  if (
    uuid[8] !== "-" ||
    uuid[13] !== "-" ||
    uuid[18] !== "-" ||
    uuid[23] !== "-"
  ) {
    return false;
  }

  // Validate each section separately (linear time)
  const sections = [
    uuid.substring(0, 8), // 8 hex chars
    uuid.substring(9, 13), // 4 hex chars
    uuid.substring(14, 18), // 4 hex chars
    uuid.substring(19, 23), // 4 hex chars
    uuid.substring(24, 36), // 12 hex chars
  ];

  // Check each section contains only valid hex characters
  for (const section of sections) {
    for (let i = 0; i < section.length; i++) {
      const char = section[i].toLowerCase();
      if (!(char >= "0" && char <= "9") && !(char >= "a" && char <= "f")) {
        return false;
      }
    }
  }

  // Validate version (4th section, first character should be 1-5)
  const versionChar = uuid[14];
  if (!(versionChar >= "1" && versionChar <= "5")) {
    return false;
  }

  // Validate variant (5th section, first character should be 8, 9, a, or b)
  const variantChar = uuid[19].toLowerCase();
  if (
    variantChar !== "8" &&
    variantChar !== "9" &&
    variantChar !== "a" &&
    variantChar !== "b"
  ) {
    return false;
  }

  return true;
};
