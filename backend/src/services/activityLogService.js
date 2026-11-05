
import prisma from "../config/database.js";

export const createActivityLog = async ({
  action,
  entityType,
  entityId,
  details = null,
  userId = null,
}) => {
  return prisma.activityLog.create({
    data: {
      action,
      entityType,
      entityId,
      details,
      userId,
    },
  });
};

export const getActivityLogs = async (filters = {}) => {
  const where = {};

  if (filters.entityType) {
    where.entityType = filters.entityType.toUpperCase();
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  return prisma.activityLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });
};

export const getEntityActivityLogs = async (entityType, entityId) => {
  return prisma.activityLog.findMany({
    where: {
      entityType: entityType.toUpperCase(),
      entityId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};
