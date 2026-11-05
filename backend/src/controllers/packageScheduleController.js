import {
  schedulePackage,
  cancelPackageSchedule,
} from "../services/packageScheduleService.js";

export const schedulePackageController = async (req, res) => {
  try {
    const result = await schedulePackage(
      req.params.packageId,
      req.body?.scheduledAt,
    );

    return res.status(200).json({
      success: true,
      message: "Package publication scheduled successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Schedule package error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to schedule this package.",
    });
  }
};

export const cancelPackageScheduleController = async (req, res) => {
  try {
    const result = await cancelPackageSchedule(req.params.packageId);

    return res.status(200).json({
      success: true,
      message: "Scheduled publication cancelled. The package is now a draft.",
      data: result,
    });
  } catch (error) {
    console.error("Cancel package schedule error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to cancel this scheduled publication.",
    });
  }
};
