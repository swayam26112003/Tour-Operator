import prisma from "../config/database.js";

export const createSeasonalPrice = async (packageId, data) => {
  const packageExists = await prisma.package.findUnique({
    where: { id: packageId },
  });

  if (!packageExists) {
    throw new Error("Package not found");
  }

  return prisma.packageSeasonalPrice.create({
    data: {
      packageId,
      season: data.season,
      hotelCategory: data.hotelCategory,
      validFrom: new Date(data.validFrom),
      validTo: new Date(data.validTo),
      pricePerPerson: data.pricePerPerson,
      priceTwinSharing: data.priceTwinSharing,
      gstPercentage: data.gstPercentage ?? 5,
    },
  });
};

export const getSeasonalPrices = async (packageId) => {
  return prisma.packageSeasonalPrice.findMany({
    where: { packageId },
    orderBy: [{ validFrom: "asc" }, { season: "asc" }],
  });
};

export const updateSeasonalPrice = async (packageId, priceId, data) => {
  const existingPrice = await prisma.packageSeasonalPrice.findFirst({
    where: {
      id: priceId,
      packageId,
    },
  });

  if (!existingPrice) {
    throw new Error("Seasonal price not found");
  }

  return prisma.packageSeasonalPrice.update({
    where: { id: priceId },
    data: {
      ...(data.season !== undefined && { season: data.season }),
      ...(data.hotelCategory !== undefined && {
        hotelCategory: data.hotelCategory,
      }),
      ...(data.validFrom !== undefined && {
        validFrom: new Date(data.validFrom),
      }),
      ...(data.validTo !== undefined && {
        validTo: new Date(data.validTo),
      }),
      ...(data.pricePerPerson !== undefined && {
        pricePerPerson: data.pricePerPerson,
      }),
      ...(data.priceTwinSharing !== undefined && {
        priceTwinSharing: data.priceTwinSharing,
      }),
      ...(data.gstPercentage !== undefined && {
        gstPercentage: data.gstPercentage,
      }),
    },
  });
};

export const deleteSeasonalPrice = async (packageId, priceId) => {
  const existingPrice = await prisma.packageSeasonalPrice.findFirst({
    where: {
      id: priceId,
      packageId,
    },
  });

  if (!existingPrice) {
    throw new Error("Seasonal price not found");
  }

  return prisma.packageSeasonalPrice.delete({
    where: { id: priceId },
  });
};