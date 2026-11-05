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

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// Application routes. Keep the existing package, media, enquiry, quote,
// journal, user and activity APIs mounted while adding version/schedule routes.
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

// Publish scheduled draft packages at or after their scheduled local-time instant.
let schedulerRunning = false;
const runPackageScheduler = async () => {
  if (schedulerRunning) return;
  schedulerRunning = true;
  try {
    await publishDuePackages();
  } catch (error) {
    console.error("Scheduled package publishing check failed:", error);
  } finally {
    schedulerRunning = false;
  }
};

// Health check
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

app.get("/", (req, res) => {
  res.json({ message: "Tour Operator API is running" });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  void runPackageScheduler();
});

const schedulerInterval = setInterval(runPackageScheduler, 30_000);
schedulerInterval.unref?.();

const shutdown = async () => {
  clearInterval(schedulerInterval);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
