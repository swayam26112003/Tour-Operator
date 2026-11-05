
import * as activityLogService from "../services/activityLogService.js";

export const getActivityLogs = async (req, res) => {
  try {
    const logs = await activityLogService.getActivityLogs(req.query);

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    console.error("Get activity logs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch activity logs",
    });
  }
};

export const getEntityActivityLogs = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    if (!["ENQUIRY", "PACKAGE"].includes(entityType.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Entity type must be ENQUIRY or PACKAGE",
      });
    }

    const logs = await activityLogService.getEntityActivityLogs(
      entityType,
      entityId
    );

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    console.error("Get entity activity logs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch entity activity history",
    });
  }
};
