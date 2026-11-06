import prisma from "../config/database.js";
import { createActivityLog } from "./activityLogService.js";

const makeHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const schedulePackage = async (packageId, scheduledAtValue) => {
  const scheduledAt = new Date(scheduledAtValue);

  if (!scheduledAtValue || Number.isNaN(scheduledAt.getTime())) {
    throw makeHttpError("Choose a valid publication date and time.", 400);
  }

  if (scheduledAt.getTime() <= Date.now()) {
    throw makeHttpError("The scheduled publication time must be in the future.", 400);
  }

  const existing = await prisma.package.findUnique({
    where: { id: packageId },
    select: { id: true, title: true, status: true },
  });

  if (!existing) {
    throw makeHttpError("Package not found.", 404);
  }

  if (!["DRAFT", "SCHEDULED"].includes(existing.status)) {
    throw makeHttpError(
      "Only draft packages can be scheduled. Duplicate a published package as a draft first so its live listing stays available.",
      409,
    );
  }

  const packageData = await prisma.package.update({
    where: { id: packageId },
    data: {
      status: "SCHEDULED",
      scheduledAt,
    },
    include: {
      itinerary: { orderBy: { dayNumber: "asc" } },
      hotels: true,
      seasonalPrices: true,
    },
  });

  try {
    await createActivityLog({
      action: "PACKAGE_PUBLICATION_SCHEDULED",
      entityType: "PACKAGE",
      entityId: packageId,
      details: { scheduledAt: scheduledAt.toISOString() },
    });
  } catch (error) {
    console.error("Package schedule activity log failed:", error);
  }

  return packageData;
};

export const cancelPackageSchedule = async (packageId) => {
  const existing = await prisma.package.findUnique({
    where: { id: packageId },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw makeHttpError("Package not found.", 404);
  }

  if (existing.status !== "SCHEDULED") {
    throw makeHttpError("This package does not have a scheduled publication.", 409);
  }

  const packageData = await prisma.package.update({
    where: { id: packageId },
    data: {
      status: "DRAFT",
      scheduledAt: null,
    },
  });

  try {
    await createActivityLog({
      action: "PACKAGE_PUBLICATION_SCHEDULE_CANCELLED",
      entityType: "PACKAGE",
      entityId: packageId,
      details: { previousStatus: "SCHEDULED" },
    });
  } catch (error) {
    console.error("Package schedule cancellation activity log failed:", error);
  }

  return packageData;
};

export const publishDuePackages = async () => {
  const now = new Date();
  const duePackages = await prisma.package.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
    },
    select: { id: true, title: true, scheduledAt: true },
  });

  let publishedCount = 0;

  for (const duePackage of duePackages) {
    const result = await prisma.package.updateMany({
      where: {
        id: duePackage.id,
        status: "SCHEDULED",
        scheduledAt: { lte: now },
      },
      data: {
        status: "PUBLISHED",
        scheduledAt: null,
      },
    });

    if (result.count === 1) {
      publishedCount += 1;
      try {
        await createActivityLog({
          action: "PACKAGE_PUBLISHED_AUTOMATICALLY",
          entityType: "PACKAGE",
          entityId: duePackage.id,
          details: {
            title: duePackage.title,
            scheduledAt: duePackage.scheduledAt?.toISOString() ?? null,
          },
        });
      } catch (error) {
        console.error("Automatic package publish activity log failed:", error);
      }
    }
  }

  if (publishedCount > 0) {
    console.log(`Scheduled publishing: ${publishedCount} package(s) published.`);
  }

  return publishedCount;
};
