import express from "express";
import {
  getPackageVersionsController,
  restorePackageVersionController,
} from "../controllers/packageVersionController.js";

const router = express.Router();

router.get("/:packageId/versions", getPackageVersionsController);
router.post(
  "/:packageId/versions/:versionId/restore",
  restorePackageVersionController,
);

export default router;
