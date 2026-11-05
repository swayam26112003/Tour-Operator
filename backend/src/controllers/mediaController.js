import * as mediaService from "../services/mediaService.js";

const handleError = (res, error, fallbackMessage) => {
  if (error.message?.startsWith("Asset name") ||
      error.message?.startsWith("A valid image URL") ||
      error.message?.startsWith("Image URL") ||
      error.message?.startsWith("Only HTTP") ||
      error.message?.startsWith("Alt text") ||
      error.message?.startsWith("Category") ||
      error.message?.startsWith("Provide at least one")) {
    return res.status(400).json({ success: false, message: error.message });
  }

  if (error.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "An asset with this URL already exists.",
    });
  }

  if (error.code === "P2025") {
    return res.status(404).json({ success: false, message: "Media asset not found." });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({ success: false, message: fallbackMessage });
};

export const getMediaAssetsController = async (req, res) => {
  try {
    const result = await mediaService.getMediaAssets(req.query);
    return res.status(200).json({
      success: true,
      count: result.data.length,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch media assets.");
  }
};

export const getMediaCategoriesController = async (_req, res) => {
  try {
    const categories = await mediaService.getMediaCategories();
    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch media categories.");
  }
};

export const getMediaAssetByIdController = async (req, res) => {
  try {
    const asset = await mediaService.getMediaAssetById(req.params.id);
    if (!asset) {
      return res.status(404).json({ success: false, message: "Media asset not found." });
    }
    return res.status(200).json({ success: true, data: asset });
  } catch (error) {
    return handleError(res, error, "Failed to fetch media asset.");
  }
};

export const createMediaAssetController = async (req, res) => {
  try {
    const asset = await mediaService.createMediaAsset(req.body);
    return res.status(201).json({
      success: true,
      message: "Media asset added successfully.",
      data: asset,
    });
  } catch (error) {
    return handleError(res, error, "Failed to add media asset.");
  }
};

export const updateMediaAssetController = async (req, res) => {
  try {
    const asset = await mediaService.updateMediaAsset(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: "Media asset updated successfully.",
      data: asset,
    });
  } catch (error) {
    return handleError(res, error, "Failed to update media asset.");
  }
};

export const deleteMediaAssetController = async (req, res) => {
  try {
    const asset = await mediaService.deleteMediaAsset(req.params.id);
    return res.status(200).json({
      success: true,
      message: "Media asset deleted successfully.",
      data: { id: asset.id },
    });
  } catch (error) {
    return handleError(res, error, "Failed to delete media asset.");
  }
};
