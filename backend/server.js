
import "dotenv/config";
import express from "express";
import cors from "cors";

import prisma from "./src/config/database.js";
import packageRoutes from "./src/routes/packageRoutes.js";
import packageVersionRoutes from "./src/routes/packageVersionRoutes.js";
import packageScheduleRoutes from "./src/routes/packageScheduleRoutes.js";
import enquiryRoutes from "./src/routes/enquiryRoutes.js";
import activityLogRoutes from "./src/routes/activityLogRoutes.js";
import seasonalPriceRoutes from "./src/routes/seasonalPriceRoutes.js";
import journalRoutes from "./src/routes/journalRoutes.js";
import quoteRoutes from "./src/routes/quoteRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import mediaRoutes from "./src/routes/mediaRoutes.js";
import { publishDuePackages } from "./src/services/packageScheduleService.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://tour-operator-frontend.onrender.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked for origin: ${origin}`)
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.use("/api/packages", packageRoutes);
app.use("/api/packages", packageVersionRoutes);
app.use("/api/packages", seasonalPriceRoutes);
app.use("/api/packages", packageScheduleRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/journal", journalRoutes);
app.use("/api/quotes", quoteRoutes);
app.use("/api/users", userRoutes);
app.use("/api/media", mediaRoutes);

let schedulerRunning = false;

const runPackageScheduler = async () => {
  if (schedulerRunning) return;

  schedulerRunning = true;

  try {
    await publishDuePackages();
  } catch (error) {
    console.error(
      "Scheduled package publishing check failed:",
      error
    );
  } finally {
    schedulerRunning = false;
  }
};

app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "Backend and Neon PostgreSQL are connected!",
      database: "Connected",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Tour Operator API is running",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);

  void runPackageScheduler();
});

const schedulerInterval = setInterval(
  runPackageScheduler,
  30_000
);

schedulerInterval.unref?.();

const shutdown = async () => {
  console.log("Shutting down backend server...");

  clearInterval(schedulerInterval);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
