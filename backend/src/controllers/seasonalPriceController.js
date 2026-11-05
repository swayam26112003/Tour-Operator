import {
  createSeasonalPrice,
  getSeasonalPrices,
  updateSeasonalPrice,
  deleteSeasonalPrice,
} from "../services/seasonalPriceService.js";

const validSeasons = ["OFF_SEASON", "MONSOON", "PEAK"];
const validHotelCategories = ["STANDARD", "DELUXE", "PREMIUM"];

const validatePriceData = (data, isUpdate = false) => {
  const errors = [];

  if (!isUpdate || data.season !== undefined) {
    if (!validSeasons.includes(data.season)) {
      errors.push("Invalid season");
    }
  }

  if (!isUpdate || data.hotelCategory !== undefined) {
    if (!validHotelCategories.includes(data.hotelCategory)) {
      errors.push("Invalid hotel category");
    }
  }

  if (!isUpdate || data.validFrom !== undefined) {
    if (!data.validFrom || Number.isNaN(Date.parse(data.validFrom))) {
      errors.push("A valid validFrom date is required");
    }
  }

  if (!isUpdate || data.validTo !== undefined) {
    if (!data.validTo || Number.isNaN(Date.parse(data.validTo))) {
      errors.push("A valid validTo date is required");
    }
  }

  if (!isUpdate || data.pricePerPerson !== undefined) {
    if (
      data.pricePerPerson === undefined ||
      !Number.isFinite(Number(data.pricePerPerson)) ||
      Number(data.pricePerPerson) <= 0
    ) {
      errors.push("pricePerPerson must be a positive number");
    }
  }

  if (!isUpdate || data.priceTwinSharing !== undefined) {
    if (
      data.priceTwinSharing === undefined ||
      !Number.isFinite(Number(data.priceTwinSharing)) ||
      Number(data.priceTwinSharing) <= 0
    ) {
      errors.push("priceTwinSharing must be a positive number");
    }
  }

  if (data.gstPercentage !== undefined) {
    if (
      !Number.isFinite(Number(data.gstPercentage)) ||
      Number(data.gstPercentage) < 0 ||
      Number(data.gstPercentage) > 100
    ) {
      errors.push("gstPercentage must be between 0 and 100");
    }
  }

  const from = data.validFrom ? Date.parse(data.validFrom) : null;
  const to = data.validTo ? Date.parse(data.validTo) : null;

  if (from !== null && to !== null && from > to) {
    errors.push("validTo must be on or after validFrom");
  }

  return errors;
};

// CREATE seasonal price
export const addSeasonalPrice = async (req, res) => {
  try {
    const errors = validatePriceData(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const price = await createSeasonalPrice(
      req.params.packageId,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Seasonal price created successfully",
      data: price,
    });
  } catch (error) {
    console.error("Create seasonal price error:", error);

    return res.status(
      error.message === "Package not found" ? 404 : 500
    ).json({
      success: false,
      message: error.message || "Failed to create seasonal price",
    });
  }
};

// GET all seasonal prices for a package
export const listSeasonalPrices = async (req, res) => {
  try {
    const prices = await getSeasonalPrices(req.params.packageId);

    return res.status(200).json({
      success: true,
      count: prices.length,
      data: prices,
    });
  } catch (error) {
    console.error("Get seasonal prices error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve seasonal prices",
    });
  }
};

// UPDATE seasonal price
export const editSeasonalPrice = async (req, res) => {
  try {
    const errors = validatePriceData(req.body, true);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const price = await updateSeasonalPrice(
      req.params.packageId,
      req.params.priceId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Seasonal price updated successfully",
      data: price,
    });
  } catch (error) {
    console.error("Update seasonal price error:", error);

    return res.status(
      error.message === "Seasonal price not found" ? 404 : 500
    ).json({
      success: false,
      message: error.message || "Failed to update seasonal price",
    });
  }
};

// DELETE seasonal price
export const removeSeasonalPrice = async (req, res) => {
  try {
    await deleteSeasonalPrice(
      req.params.packageId,
      req.params.priceId
    );

    return res.status(200).json({
      success: true,
      message: "Seasonal price deleted successfully",
    });
  } catch (error) {
    console.error("Delete seasonal price error:", error);

    return res.status(
      error.message === "Seasonal price not found" ? 404 : 500
    ).json({
      success: false,
      message: error.message || "Failed to delete seasonal price",
    });
  }
};