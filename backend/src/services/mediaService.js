import prisma from "../config/database.js";
import { createActivityLog } from "./activityLogService.js";

const MAX_PAGE_SIZE = 100;

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : value;

const validateImageUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("A valid image URL is required.");
  }

  if (value.length > 2048) {
    throw new Error("Image URL must be 2048 characters or fewer.");
  }

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error("Image URL must be a valid HTTP or HTTPS URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS image URLs are supported.");
  }

  return parsed.toString();
};

const validateAssetInput = (input, { partial = false } = {}) => {
  const data = {};

  if (!partial || Object.hasOwn(input, "name")) {
    const name = normalizeText(input.name);
    if (typeof name !== "string" || !name || name.length > 120) {
      throw new Error("Asset name is required and must be 120 characters or fewer.");
    }
    data.name = name;
  }

  if (!partial || Object.hasOwn(input, "url")) {
    data.url = validateImageUrl(input.url);
  }

  if (Object.hasOwn(input, "altText")) {
    const altText = normalizeText(input.altText);
    if (altText !== null && altText !== undefined && typeof altText !== "string") {
      throw new Error("Alt text must be a string.");
    }
    if (altText && altText.length > 250) {
      throw new Error("Alt text must be 250 characters or fewer.");
    }
    data.altText = altText || null;
  } else if (!partial) {
    data.altText = null;
  }

  if (Object.hasOwn(input, "category")) {
    const category = normalizeText(input.category);
    if (category !== null && category !== undefined && typeof category !== "string") {
      throw new Error("Category must be a string.");
    }
    if (category && category.length > 60) {
      throw new Error("Category must be 60 characters or fewer.");
    }
    data.category = category || null;
  } else if (!partial) {
    data.category = null;
  }

  return data;
};

const recordMediaActivity = async ({ action, asset }) => {
  try {
    await createActivityLog({
      action,
      entityType: "MEDIA",
      entityId: asset.id,
      details: {
        name: asset.name,
        url: asset.url,
        category: asset.category,
      },
    });
  } catch (error) {
    console.error("Media activity log failed:", error);
  }
};

export const getMediaAssets = async (filters = {}) => {
  const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
  const requestedLimit = Number.parseInt(filters.limit, 10) || 24;
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, requestedLimit));
  const search = typeof filters.search === "string" ? filters.search.trim() : "";
  const category = typeof filters.category === "string" ? filters.category.trim() : "";

  const where = {};

  if (category) {
    where.category = { equals: category, mode: "insensitive" };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { url: { contains: search, mode: "insensitive" } },
      { altText: { contains: search, mode: "insensitive" } },
    ];
  }

  const [assets, total] = await Promise.all([
    prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.mediaAsset.count({ where }),
  ]);

  return {
    data: assets,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getMediaAssetById = async (id) => {
  return prisma.mediaAsset.findUnique({ where: { id } });
};

export const getMediaCategories = async () => {
  const records = await prisma.mediaAsset.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  return records.map((record) => record.category).filter(Boolean);
};

export const createMediaAsset = async (input) => {
  const data = validateAssetInput(input ?? {});

  const asset = await prisma.mediaAsset.create({ data });
  await recordMediaActivity({ action: "MEDIA_ASSET_CREATED", asset });
  return asset;
};

export const updateMediaAsset = async (id, input) => {
  const data = validateAssetInput(input ?? {}, { partial: true });
  if (Object.keys(data).length === 0) {
    throw new Error("Provide at least one field to update.");
  }

  const asset = await prisma.mediaAsset.update({ where: { id }, data });
  await recordMediaActivity({ action: "MEDIA_ASSET_UPDATED", asset });
  return asset;
};

export const deleteMediaAsset = async (id) => {
  const asset = await prisma.mediaAsset.delete({ where: { id } });
  await recordMediaActivity({ action: "MEDIA_ASSET_DELETED", asset });
  return asset;
};
