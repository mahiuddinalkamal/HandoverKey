export interface EncryptedData {
  data: Uint8Array;
  iv: Uint8Array;
  algorithm: string;
  salt?: Uint8Array;
  iterations?: number;
}

export interface KeyDerivationParams {
  salt: Uint8Array;
  iterations: number;
  hash: string;
  keyLength: number;
}

export interface ShamirShare {
  id: string;
  share: string;
  threshold: number;
  totalShares: number;
}

export interface MasterKey {
  key: CryptoKey;
  salt: Uint8Array;
  iterations: number;
}

export interface VaultEntry {
  id: string;
  userId: string;
  encryptedData: EncryptedData;
  category?: string;
  tags?: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Successor {
  id: string;
  userId: string;
  email: string;
  name?: string;
  verificationToken?: string;
  verified: boolean;
  handoverDelayDays: number;
  createdAt: Date;
}

export interface HandoverEvent {
  id: string;
  userId: string;
  eventType:
    | "INACTIVITY_DETECTED"
    | "HANDOVER_TRIGGERED"
    | "SUCCESSOR_NOTIFIED";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  triggeredAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}
