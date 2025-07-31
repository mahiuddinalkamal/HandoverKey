import { DatabaseConnection } from "@handoverkey/database";

// Mock the database connection for tests
jest.mock("@handoverkey/database", () => ({
  DatabaseConnection: {
    initialize: jest.fn(),
    testConnection: jest.fn().mockResolvedValue(true),
    query: jest.fn(),
    close: jest.fn(),
  },
}));

// Mock the JobManager for tests
jest.mock("./services/job-manager", () => ({
  JobManager: {
    getInstance: jest.fn().mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
      getHealthStatus: jest.fn().mockResolvedValue({
        isHealthy: true,
        jobs: {
          inactivityMonitor: {
            isHealthy: true,
            stats: { isRunning: false, checkInterval: 900000, activeUsers: 0, systemStatus: 'operational' },
          },
        },
      }),
    }),
  },
}));

// Set NODE_ENV to test
process.env.NODE_ENV = "test";