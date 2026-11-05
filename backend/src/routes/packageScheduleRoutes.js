import express from "express";
import {
  schedulePackageController,
  cancelPackageScheduleController,
} from "../controllers/packageScheduleController.js";

const router = express.Router();

router.patch("/:packageId/schedule", schedulePackageController);
router.patch("/:packageId/cancel-schedule", cancelPackageScheduleController);

export default router;
