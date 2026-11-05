
import * as packageService from "../services/packageService.js";

export const getPackages = async (req, res) => {
  try {
    const packages = await packageService.getAllPackages(req.query);

    res.status(200).json({
      success: true,
      count: packages.length,
      data: packages,
    });
  } catch (error) {
    console.error("Get packages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch packages",
    });
  }
};

export const getPackage = async (req, res) => {
  try {
    const { id } = req.params;

    const result = req.query.by === "slug"
      ? await packageService.getPackageBySlug(id)
      : await packageService.getPackageById(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get package error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch package",
    });
  }
};

export const createPackage = async (req, res) => {
  try {
    const { title, slug } = req.body;

    if (!title || !slug) {
      return res.status(400).json({
        success: false,
        message: "Title and slug are required",
      });
    }

    const result = await packageService.createPackage(req.body);

    res.status(201).json({
      success: true,
      message: "Package created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Create package error:", error);

    res.status(error.code === "P2002" ? 409 : 500).json({
      success: false,
      message:
        error.code === "P2002"
          ? "A package with this slug or code already exists"
          : "Failed to create package",
    });
  }
};

export const updatePackage = async (req, res) => {
  try {
    const result = await packageService.updatePackage(
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Package updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Update package error:", error);

    res.status(error.code === "P2025" ? 404 : 500).json({
      success: false,
      message:
        error.code === "P2025"
          ? "Package not found"
          : "Failed to update package",
    });
  }
};

export const removePackage = async (req, res) => {
  try {
    await packageService.deletePackage(req.params.id);

    res.status(200).json({
      success: true,
      message: "Package deleted successfully",
    });
  } catch (error) {
    console.error("Delete package error:", error);

    res.status(error.code === "P2025" ? 404 : 500).json({
      success: false,
      message:
        error.code === "P2025"
          ? "Package not found"
          : "Failed to delete package",
    });
  }
};

export const duplicatePackageController = async (req, res) => {
  try {
    const duplicatedPackage = await packageService.duplicatePackage(
  req.params.id
);

    return res.status(201).json({
      success: true,
      message: "Package duplicated successfully",
      data: duplicatedPackage,
    });
  } catch (error) {
    console.error("Duplicate package error:", error);

    return res.status(
      error.message === "Package not found" ? 404 : 500
    ).json({
      success: false,
      message: error.message || "Failed to duplicate package",
    });
  }
};

export const previewPackageController = async (req, res) => {
  try {
   const packageData = await packageService.previewPackage(
  req.params.id
);

    return res.status(200).json({
      success: true,
      message: "Package preview retrieved successfully",
      data: packageData,
    });
  } catch (error) {
    console.error("Package preview error:", error);

    return res.status(
      error.message === "Package not found" ? 404 : 500
    ).json({
      success: false,
      message: error.message || "Failed to preview package",
    });
  }
};

export const getPackageVersionsController = async (req, res) => {
  try {
    const { id } = req.params;

    const versions = await packageService.getPackageVersions(id);

    return res.status(200).json({
      success: true,
      count: versions.length,
      data: versions,
    });
  } catch (error) {
    console.error("Get package versions error:", error);

    if (error.message === "Package not found") {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch package versions",
    });
  }
};

// RESTORE PACKAGE VERSION
export const restorePackageVersionController = async (req, res) => {
  try {
    const { id, versionId } = req.params;

    const result = await packageService.restorePackageVersion(
      id,
      versionId
    );

    return res.status(200).json({
      success: true,
      message: `Package successfully restored to version ${result.restoredVersion}`,
      data: result,
    });
  } catch (error) {
    console.error("Restore package version error:", error);

    if (error.message === "Package not found") {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    if (error.message === "Package version not found") {
      return res.status(404).json({
        success: false,
        message: "Package version not found",
      });
    }

    if (error.message === "Invalid package snapshot") {
      return res.status(400).json({
        success: false,
        message: "The selected version contains an invalid snapshot",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to restore package version",
    });
  }
};