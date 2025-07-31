import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { DatabaseConnection } from "@handoverkey/database";
import {
  securityHeaders,
  rateLimiter,
  corsOptions,
  validateContentType,
  sanitizeInput,
} from "./middleware/security";
import authRoutes from "./routes/auth-routes";
import vaultRoutes from "./routes/vault-routes";
import activityRoutes from "./routes/activity-routes";
import { JobManager } from "./services/job-manager";

dotenv.config();

const app = express();

// Initialize database connection
DatabaseConnection.initialize();

// Initialize and start background jobs (only in non-test environment)
const jobManager = JobManager.getInstance();
if (process.env.NODE_ENV !== 'test') {
  jobManager.start();
}

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(rateLimiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Validation and sanitization middleware
app.use(validateContentType);
app.use(sanitizeInput);

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const dbHealthy = await DatabaseConnection.testConnection();
    const jobHealth = await jobManager.getHealthStatus();

    const isHealthy = dbHealthy && jobHealth.isHealthy;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.1.0",
      checks: {
        database: dbHealthy ? "ok" : "failed",
        jobs: jobHealth.isHealthy ? "ok" : "failed",
      },
      jobs: jobHealth.jobs,
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.1.0",
      error: "Health check failed",
    });
  }
});

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/vault", vaultRoutes);
app.use("/api/v1/activity", activityRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Error handling middleware
app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", error);

    if (error.type === "entity.parse.failed") {
      res.status(400).json({ error: "Invalid JSON payload" });
      return;
    }

    res.status(500).json({ error: "Internal server error" });
  },
);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  jobManager.stop();
  await DatabaseConnection.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  jobManager.stop();
  await DatabaseConnection.close();
  process.exit(0);
});

export default app;
