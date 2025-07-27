export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/api/v1/auth/register',
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
    REFRESH: '/api/v1/auth/refresh',
    PROFILE: '/api/v1/auth/profile',
  },
  VAULT: {
    ENTRIES: '/api/v1/vault/entries',
    SEARCH: '/api/v1/vault/search',
  },
  USERS: {
    PROFILE: '/api/v1/users/profile',
    SUCCESSORS: '/api/v1/users/successors',
  },
  HANDOVER: {
    STATUS: '/api/v1/handover/status',
    CHECK_IN: '/api/v1/handover/check-in',
    AUDIT_LOGS: '/api/v1/handover/audit-logs',
  },
} as const;

export const ENCRYPTION_CONSTANTS = {
  ALGORITHM: 'AES-GCM',
  KEY_LENGTH: 256,
  IV_LENGTH: 12,
  TAG_LENGTH: 128,
  PBKDF2_ITERATIONS: 100000,
  SALT_LENGTH: 16,
} as const;

export const VALIDATION_RULES = {
  PASSWORD: {
    MIN_LENGTH: 12,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
  },
  EMAIL: {
    MAX_LENGTH: 255,
  },
  VAULT: {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    MAX_CATEGORY_LENGTH: 100,
    MAX_TAG_LENGTH: 50,
    MAX_TAGS_PER_ENTRY: 10,
  },
} as const;

export const DEFAULT_VALUES = {
  HANDOVER_DELAY_DAYS: 90,
  REMINDER_INTERVAL_DAYS: 7,
  MAX_REMINDER_COUNT: 3,
  SESSION_TIMEOUT_HOURS: 24,
  REFRESH_TOKEN_DAYS: 7,
} as const;

export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCOUNT_LOCKED: 'Account temporarily locked due to too many failed attempts',
    TOKEN_EXPIRED: 'Session expired, please log in again',
    UNAUTHORIZED: 'You are not authorized to perform this action',
    EMAIL_ALREADY_EXISTS: 'An account with this email already exists',
    WEAK_PASSWORD: 'Password does not meet security requirements',
  },
  VAULT: {
    ENTRY_NOT_FOUND: 'Vault entry not found',
    DECRYPTION_FAILED: 'Failed to decrypt vault entry',
    FILE_TOO_LARGE: 'File size exceeds maximum allowed limit',
    INVALID_CATEGORY: 'Invalid category name',
    TOO_MANY_TAGS: 'Too many tags for this entry',
  },
  GENERAL: {
    INTERNAL_ERROR: 'An internal error occurred',
    VALIDATION_FAILED: 'Input validation failed',
    NETWORK_ERROR: 'Network connection error',
    RATE_LIMITED: 'Too many requests, please try again later',
  },
} as const;