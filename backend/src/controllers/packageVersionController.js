import {
  getPackageVersions,
  restorePackageVersion,
} from "../services/packageService.js";
import { createActivityLog } from "../services/activityLogService.js";

export const getPackageVersionsController = async (req, res) => {
  try {
    const versions = await getPackageVersions(req.params.packageId);

    return res.status(200).json({
      success: true,
      count: versions.length,
      data: versions,
    });
  } catch (error) {
    console.error("Get package versions error:", error);
    const notFound = error.message?.toLowerCase().includes("not found");

    return res.status(notFound ? 404 : 500).json({
      success: false,
      message: error.message || "Failed to fetch package version history.",
    });
  }
};

export const restorePackageVersionController = async (req, res) => {
  try {
    const result = await restorePackageVersion(
      req.params.packageId,
      req.params.versionId,
    );

    // Activity logging must not turn a successful restore into a failed response.
    try {
      await createActivityLog({
        action: "PACKAGE_VERSION_RESTORED",
        entityType: "PACKAGE",
        entityId: req.params.packageId,
        details: {
          restoredVersion: result.restoredVersion,
          newVersion: result.newVersion,
          restoredAs: "DRAFT",
        },
      });
    } catch (activityError) {
      console.error("Package version restore activity log failed:", activityError);
    }

    return res.status(200).json({
      success: true,
      message: `Version ${result.restoredVersion} restored as a draft.`,
      data: result,
    });
  } catch (error) {
    console.error("Restore package version error:", error);
    const notFound = error.message?.toLowerCase().includes("not found");

    return res.status(notFound ? 404 : 500).json({
      success: false,
      message: error.message || "Failed to restore package version.",
    });
  }
};
