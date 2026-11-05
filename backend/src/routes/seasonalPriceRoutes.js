import express from "express";

import {
  addSeasonalPrice,
  listSeasonalPrices,
  editSeasonalPrice,
  removeSeasonalPrice,
} from "../controllers/seasonalPriceController.js";

const router = express.Router();

// Create seasonal pricing
router.post("/:packageId/prices", addSeasonalPrice);

// Get all seasonal prices for a package
router.get("/:packageId/prices", listSeasonalPrices);

// Update a seasonal price
router.put("/:packageId/prices/:priceId", editSeasonalPrice);

// Delete a seasonal price
router.delete("/:packageId/prices/:priceId", removeSeasonalPrice);

export default router;