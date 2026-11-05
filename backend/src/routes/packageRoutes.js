import express from "express";

import {
  getPackages,
  getPackage,
  createPackage,
  updatePackage,
  removePackage,
  duplicatePackageController,
  previewPackageController,
  getPackageVersionsController,
  restorePackageVersionController,
} from "../controllers/packageController.js";

const router = express.Router();

// Package browsing
router.get("/", getPackages);
router.get("/:id", getPackage);

// Package management
router.post("/", createPackage);
router.put("/:id", updatePackage);
router.delete("/:id", removePackage);

// Package duplication
router.post("/:id/duplicate", duplicatePackageController);

// Preview and version history
router.get("/:id/preview", previewPackageController);
router.get("/:id/versions", getPackageVersionsController);
router.post("/:id/versions/:versionId/restore", restorePackageVersionController);

export default router;