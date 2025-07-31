// Dead Man's Switch Types

export interface ActivityRecord {
  id: string;
  userId: string;
  activityType: ActivityType;
  clientType: ClientType;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  signature: string;
  createdAt: Date;
}

export interface ActivityStatus {
  lastActivity: Date;
  inactivityDuration: number; // milliseconds
  thresholdPercentage: number;
  nextReminderDue: Date | null;
  handoverStatus: HandoverStatus;
  timeRemaining: number; // milliseconds
}

export interface InactivitySettings {
  userId: string;
  thresholdDays: number;
  notificationMethods: NotificationMethod[];
  emergencyContacts: EmergencyContact[];
  isPaused: boolean;
  pauseReason?: string;
  pausedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface HandoverProcess {
  id: string;
  userId: string;
  status: HandoverProcessStatus;
  initiatedAt: Date;
  gracePeriodEnds: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDelivery {
  id: string;
  userId: string;
  handoverProcessId?: string;
  notificationType: ReminderType;
  method: NotificationMethod;
  recipient: string;
  status: DeliveryStatus;
  deliveredAt?: Date;
  retryCount: number;
  errorMessage?: string;
  createdAt: Date;
}

export interface CheckInToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface SuccessorNotification {
  id: string;
  handoverProcessId: string;
  successorId: string;
  notifiedAt: Date;
  verificationStatus: VerificationStatus;
  verifiedAt?: Date;
  responseDeadline: Date;
  verificationToken?: string;
  createdAt: Date;
}

export interface SystemStatus {
  id: string;
  status: SystemStatusType;
  downtimeStart?: Date;
  downtimeEnd?: Date;
  reason?: string;
  createdAt: Date;
}

export interface EmergencyContact {
  name: string;
  email: string;
  phone?: string;
  relationship: string;
  verified: boolean;
}

export interface NotificationResult {
  id: string;
  userId: string;
  method: NotificationMethod;
  status: DeliveryStatus;
  timestamp: Date;
  retryCount: number;
  errorMessage?: string;
}

export interface CheckInValidation {
  isValid: boolean;
  userId?: string;
  error?: string;
  remainingTime?: number;
}

export interface HandoverAuditEntry {
  id: string;
  handoverProcessId: string;
  eventType: string;
  timestamp: Date;
  details: Record<string, any>;
  signature: string;
}

// Enums
export enum ActivityType {
  LOGIN = 'login',
  VAULT_ACCESS = 'vault_access',
  SETTINGS_CHANGE = 'settings_change',
  MANUAL_CHECKIN = 'manual_checkin',
  API_REQUEST = 'api_request',
  SUCCESSOR_MANAGEMENT = 'successor_management',
  HANDOVER_CANCELLED = 'handover_cancelled'
}

export enum ClientType {
  WEB = 'web',
  MOBILE = 'mobile',
  CLI = 'cli',
  API = 'api'
}

export enum HandoverStatus {
  NORMAL = 'normal',
  REMINDER_PHASE = 'reminder_phase',
  GRACE_PERIOD = 'grace_period',
  HANDOVER_ACTIVE = 'handover_active',
  PAUSED = 'paused'
}

export enum HandoverProcessStatus {
  GRACE_PERIOD = 'grace_period',
  AWAITING_SUCCESSORS = 'awaiting_successors',
  VERIFICATION_PENDING = 'verification_pending',
  READY_FOR_TRANSFER = 'ready_for_transfer',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ReminderType {
  FIRST_REMINDER = 'first_reminder',    // 75%
  SECOND_REMINDER = 'second_reminder',  // 85%
  FINAL_WARNING = 'final_warning',      // 95%
  GRACE_PERIOD = 'grace_period',        // 100%+
  HANDOVER_INITIATED = 'handover_initiated',
  SUCCESSOR_NOTIFICATION = 'successor_notification'
}

export enum NotificationMethod {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push'
}

export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced'
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

export enum SystemStatusType {
  OPERATIONAL = 'operational',
  MAINTENANCE = 'maintenance',
  DEGRADED = 'degraded',
  OUTAGE = 'outage'
}

// Request/Response interfaces
export interface UpdateInactivitySettingsRequest {
  thresholdDays?: number;
  notificationMethods?: NotificationMethod[];
  emergencyContacts?: EmergencyContact[];
}

export interface CheckInRequest {
  token: string;
}

export interface CheckInResponse {
  success: boolean;
  message: string;
  timeRemaining?: number;
}

export interface HandoverStatusResponse {
  activityStatus: ActivityStatus;
  inactivitySettings: InactivitySettings;
  activeHandover?: HandoverProcess;
  recentNotifications: NotificationDelivery[];
}

export interface ActivityHistoryRequest {
  startDate?: Date;
  endDate?: Date;
  activityTypes?: ActivityType[];
  limit?: number;
  offset?: number;
}

export interface ActivityHistoryResponse {
  activities: ActivityRecord[];
  total: number;
  hasMore: boolean;
}

// Service interfaces
export interface ActivityTracker {
  recordActivity(userId: string, activityType: ActivityType, metadata?: any): Promise<void>;
  getLastActivity(userId: string): Promise<ActivityRecord | null>;
  getUserActivityStatus(userId: string): Promise<ActivityStatus>;
  pauseTracking(userId: string, reason: string, until?: Date): Promise<void>;
  resumeTracking(userId: string): Promise<void>;
}

export interface NotificationService {
  sendReminder(userId: string, reminderType: ReminderType): Promise<NotificationResult>;
  sendHandoverAlert(userId: string, successors: string[]): Promise<NotificationResult[]>;
  generateCheckInLink(userId: string, expiresIn: number): Promise<string>;
  validateCheckInLink(token: string): Promise<CheckInValidation>;
}

export interface HandoverOrchestrator {
  initiateHandover(userId: string): Promise<HandoverProcess>;
  cancelHandover(userId: string, reason: string): Promise<void>;
  processSuccessorResponse(handoverId: string, successorId: string, response: any): Promise<void>;
  getHandoverStatus(userId: string): Promise<HandoverProcess | null>;
}

export interface InactivityMonitor {
  checkUserInactivity(userId: string): Promise<void>;
  checkAllUsers(): Promise<void>;
  pauseSystemTracking(reason: string): Promise<void>;
  resumeSystemTracking(): Promise<void>;
}