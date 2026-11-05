import express from "express";
import {
  getMediaAssetsController,
  getMediaCategoriesController,
  getMediaAssetByIdController,
  createMediaAssetController,
  updateMediaAssetController,
  deleteMediaAssetController,
} from "../controllers/mediaController.js";

const router = express.Router();

router.get("/", getMediaAssetsController);
router.get("/categories", getMediaCategoriesController);
router.post("/", createMediaAssetController);
router.get("/:id", getMediaAssetByIdController);
router.put("/:id", updateMediaAssetController);
router.delete("/:id", deleteMediaAssetController);

export default router;
