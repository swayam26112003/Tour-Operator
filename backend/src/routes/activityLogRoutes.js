import express from "express";

import {
  getActivityLogs,
  getEntityActivityLogs,
} from "../controllers/activityLogController.js";

const router = express.Router();

router.get("/", getActivityLogs);
router.get("/:entityType/:entityId", getEntityActivityLogs);

export default router;