import prisma from "../config/database.js";

console.log("Package service Prisma check:", typeof prisma.package);

// GET ALL PACKAGES
export const getAllPackages = async (filters = {}) => {
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.featured === "true") {
    where.featured = true;
  }

  return prisma.package.findMany({
    where,
    include: {
      itinerary: {
        orderBy: { dayNumber: "asc" },
      },
      hotels: true,
      seasonalPrices: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

// GET PACKAGE BY ID
export const getPackageById = async (id) => {
  return prisma.package.findUnique({
    where: { id },
    include: {
      itinerary: {
        orderBy: { dayNumber: "asc" },
      },
      hotels: true,
      seasonalPrices: true,
    },
  });
};

// GET PACKAGE BY SLUG
export const getPackageBySlug = async (slug) => {
  return prisma.package.findUnique({
    where: { slug },
    include: {
      itinerary: {
        orderBy: { dayNumber: "asc" },
      },
      hotels: true,
      seasonalPrices: true,
    },
  });
};

// CREATE PACKAGE
export const createPackage = async (data) => {
  const { itinerary, hotels, changeNote, ...packageData } = data;

  return prisma.package.create({
    data: {
      ...packageData,

      itinerary: itinerary?.length ? { create: itinerary } : undefined,

      hotels: hotels?.length ? { create: hotels } : undefined,
    },
    include: {
      itinerary: true,
      hotels: true,
      seasonalPrices: true,
    },
  });
};

// Resolve a unique slug while excluding the package being edited.
// This prevents duplicated packages from overwriting an existing copy slug.
const resolveUniquePackageSlug = async (
  tx,
  requestedSlug,
  currentPackageId,
) => {
  if (!requestedSlug) return requestedSlug;

  const baseSlug = String(requestedSlug).trim();
  let candidate = baseSlug;
  let suffix = 2;

  while (
    await tx.package.findFirst({
      where: {
        slug: candidate,
        ...(currentPackageId ? { id: { not: currentPackageId } } : {}),
      },
      select: { id: true },
    })
  ) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

// UPDATE PACKAGE + AUTOMATIC VERSION HISTORY
export const updatePackage = async (id, data) => {
  const { itinerary, hotels, changeNote, ...packageData } = data;

  return prisma.$transaction(
    async (tx) => {
      // 1. Fetch the existing package and all related data
      const existingPackage = await tx.package.findUnique({
        where: { id },
        include: {
          itinerary: {
            orderBy: { dayNumber: "asc" },
          },
          hotels: true,
          seasonalPrices: true,
        },
      });

      if (!existingPackage) {
        const error = new Error("Package not found");
        error.code = "P2025";
        throw error;
      }

      const resolvedSlug =
        packageData.slug !== undefined
          ? await resolveUniquePackageSlug(tx, packageData.slug, id)
          : undefined;

      // 2. Find the latest version number
      const latestVersion = await tx.packageVersion.aggregate({
        where: { packageId: id },
        _max: {
          version: true,
        },
      });

      const nextVersion = (latestVersion._max.version ?? 0) + 1;

      // 3. Create a complete JSON-safe snapshot
      const snapshot = {
        title: existingPackage.title,
        slug: existingPackage.slug,
        code: existingPackage.code,
        description: existingPackage.description,
        destination: existingPackage.destination,
        duration: existingPackage.duration,
        price: existingPackage.price.toString(),
        image: existingPackage.image,
        category: existingPackage.category,
        status: existingPackage.status,
        scheduledAt: existingPackage.scheduledAt?.toISOString() ?? null,
        featured: existingPackage.featured,
        inclusions: existingPackage.inclusions || [],
        exclusions: existingPackage.exclusions || [],
        mapStops: existingPackage.mapStops || [],

        itinerary: existingPackage.itinerary.map((day) => ({
          dayNumber: day.dayNumber,
          title: day.title,
          description: day.description,
          location: day.location,
          activities: day.activities,
        })),

        hotels: existingPackage.hotels.map((hotel) => ({
          name: hotel.name,
          location: hotel.location,
          roomType: hotel.roomType,
          description: hotel.description,
          image: hotel.image,
          price: hotel.price?.toString() ?? null,
        })),

        seasonalPrices: existingPackage.seasonalPrices.map((price) => ({
          season: price.season,
          hotelCategory: price.hotelCategory,
          validFrom: price.validFrom.toISOString(),
          validTo: price.validTo.toISOString(),
          pricePerPerson: price.pricePerPerson.toString(),
          priceTwinSharing: price.priceTwinSharing.toString(),
          gstPercentage: price.gstPercentage.toString(),
        })),
      };

      // 4. Save the previous package state
      await tx.packageVersion.create({
        data: {
          packageId: id,
          version: nextVersion,
          snapshot,
          changeNote: changeNote || "Automatic snapshot before package update",
        },
      });

      // 5. Replace itinerary if supplied
      if (itinerary !== undefined) {
        await tx.itineraryDay.deleteMany({
          where: { packageId: id },
        });
      }

      // 6. Replace hotels if supplied
      if (hotels !== undefined) {
        await tx.hotel.deleteMany({
          where: { packageId: id },
        });
      }

      // 7. Update the package
      const updatedPackage = await tx.package.update({
        where: { id },
        data: {
          ...packageData,
          ...(resolvedSlug !== undefined && { slug: resolvedSlug }),

          ...(itinerary !== undefined && {
            itinerary: {
              create: itinerary,
            },
          }),

          ...(hotels !== undefined && {
            hotels: {
              create: hotels,
            },
          }),
        },
        include: {
          itinerary: {
            orderBy: { dayNumber: "asc" },
          },
          hotels: true,
          seasonalPrices: true,
        },
      });

      return updatedPackage;
    },
    {
      maxWait: 15000,
      timeout: 30000,
    },
  );
};

// DELETE PACKAGE
export const deletePackage = async (id) => {
  return prisma.package.delete({
    where: { id },
  });
};

// DUPLICATE PACKAGE
export const duplicatePackage = async (packageId) => {
  const originalPackage = await prisma.package.findUnique({
    where: { id: packageId },
    include: {
      itinerary: {
        orderBy: { dayNumber: "asc" },
      },
      hotels: true,
      seasonalPrices: true,
    },
  });

  if (!originalPackage) {
    throw new Error("Package not found");
  }

  const baseSlug = `${originalPackage.slug}-copy`;
  let newSlug = baseSlug;
  let counter = 1;

  while (
    await prisma.package.findUnique({
      where: { slug: newSlug },
      select: { id: true },
    })
  ) {
    counter++;
    newSlug = `${baseSlug}-${counter}`;
  }

  return prisma.package.create({
    data: {
      title: `${originalPackage.title} (Copy)`,
      slug: newSlug,
      description: originalPackage.description,
      destination: originalPackage.destination,
      duration: originalPackage.duration,
      price: originalPackage.price,
      image: originalPackage.image,
      category: originalPackage.category,
      status: "DRAFT",
      featured: false,
      inclusions: originalPackage.inclusions || [],
      exclusions: originalPackage.exclusions || [],
      mapStops: originalPackage.mapStops || [],

      itinerary: {
        create: originalPackage.itinerary.map((day) => ({
          dayNumber: day.dayNumber,
          title: day.title,
          description: day.description,
          location: day.location,
          activities: day.activities,
        })),
      },

      hotels: {
        create: originalPackage.hotels.map((hotel) => ({
          name: hotel.name,
          location: hotel.location,
          roomType: hotel.roomType,
          description: hotel.description,
          image: hotel.image,
          price: hotel.price,
        })),
      },

      seasonalPrices: {
        create: originalPackage.seasonalPrices.map((price) => ({
          season: price.season,
          hotelCategory: price.hotelCategory,
          validFrom: price.validFrom,
          validTo: price.validTo,
          pricePerPerson: price.pricePerPerson,
          priceTwinSharing: price.priceTwinSharing,
          gstPercentage: price.gstPercentage,
        })),
      },
    },
    include: {
      itinerary: true,
      hotels: true,
      seasonalPrices: true,
    },
  });
};

// PACKAGE PREVIEW
export const previewPackage = async (packageId) => {
  const packageData = await prisma.package.findUnique({
    where: { id: packageId },
    include: {
      itinerary: {
        orderBy: { dayNumber: "asc" },
      },
      hotels: true,
      seasonalPrices: {
        orderBy: [{ validFrom: "asc" }, { season: "asc" }],
      },
    },
  });

  if (!packageData) {
    throw new Error("Package not found");
  }

  return packageData;
};

export const getPackageVersions = async (packageId) => {
  // Verify that the package exists
  const packageExists = await prisma.package.findUnique({
    where: { id: packageId },
    select: { id: true },
  });

  if (!packageExists) {
    throw new Error("Package not found");
  }

  return prisma.packageVersion.findMany({
    where: { packageId },
    orderBy: {
      version: "desc",
    },
    select: {
      id: true,
      version: true,
      changeNote: true,
      createdAt: true,
    },
  });
};

// RESTORE PACKAGE VERSION
export const restorePackageVersion = async (packageId, versionId) => {
  return prisma.$transaction(
    async (tx) => {
      // 1. Find the selected historical version
      const selectedVersion = await tx.packageVersion.findFirst({
        where: {
          id: versionId,
          packageId,
        },
      });

      if (!selectedVersion) {
        throw new Error("Package version not found");
      }

      // 2. Fetch the current package with all related data
      const currentPackage = await tx.package.findUnique({
        where: { id: packageId },
        include: {
          itinerary: {
            orderBy: { dayNumber: "asc" },
          },
          hotels: true,
          seasonalPrices: true,
        },
      });

      if (!currentPackage) {
        throw new Error("Package not found");
      }

      // 3. Create a snapshot of the current package
      const currentSnapshot = {
        title: currentPackage.title,
        slug: currentPackage.slug,
        code: currentPackage.code,
        description: currentPackage.description,
        destination: currentPackage.destination,
        duration: currentPackage.duration,
        price: currentPackage.price.toString(),
        image: currentPackage.image,
        category: currentPackage.category,
        status: currentPackage.status,
        scheduledAt: currentPackage.scheduledAt?.toISOString() ?? null,
        featured: currentPackage.featured,
        inclusions: currentPackage.inclusions || [],
        exclusions: currentPackage.exclusions || [],
        mapStops: currentPackage.mapStops || [],

        itinerary: currentPackage.itinerary.map((day) => ({
          dayNumber: day.dayNumber,
          title: day.title,
          description: day.description,
          location: day.location,
          activities: day.activities,
        })),

        hotels: currentPackage.hotels.map((hotel) => ({
          name: hotel.name,
          location: hotel.location,
          roomType: hotel.roomType,
          description: hotel.description,
          image: hotel.image,
          price: hotel.price?.toString() ?? null,
        })),

        seasonalPrices: currentPackage.seasonalPrices.map((price) => ({
          season: price.season,
          hotelCategory: price.hotelCategory,
          validFrom: price.validFrom.toISOString(),
          validTo: price.validTo.toISOString(),
          pricePerPerson: price.pricePerPerson.toString(),
          priceTwinSharing: price.priceTwinSharing.toString(),
          gstPercentage: price.gstPercentage.toString(),
        })),
      };

      // 4. Calculate the next version number
      const latestVersion = await tx.packageVersion.aggregate({
        where: { packageId },
        _max: { version: true },
      });

      const nextVersion = (latestVersion._max.version ?? 0) + 1;

      // 5. Save the current state before restoring
      await tx.packageVersion.create({
        data: {
          packageId,
          version: nextVersion,
          snapshot: currentSnapshot,
          changeNote: `Before restoring version ${selectedVersion.version}`,
        },
      });

      // 6. Read the historical snapshot
      const snapshot = selectedVersion.snapshot;

      if (
        !snapshot ||
        typeof snapshot !== "object" ||
        Array.isArray(snapshot)
      ) {
        throw new Error("Invalid package snapshot");
      }

      // 7. Remove current related records
      await tx.itineraryDay.deleteMany({
        where: { packageId },
      });

      await tx.hotel.deleteMany({
        where: { packageId },
      });

      await tx.packageSeasonalPrice.deleteMany({
        where: { packageId },
      });

      // 8. Restore package details and related records
      const restoredPackage = await tx.package.update({
        where: { id: packageId },
        data: {
          title: snapshot.title,
          slug: snapshot.slug,
          code: snapshot.code,
          description: snapshot.description,
          destination: snapshot.destination,
          duration: snapshot.duration,
          price: snapshot.price,
          image: snapshot.image,
          category: snapshot.category,
          // Restored content is always staged as a draft. It must never
          // replace the currently published package without a fresh publish action.
          status: "DRAFT",
          scheduledAt: null,
          featured: snapshot.featured,
          inclusions: snapshot.inclusions ?? [],
          exclusions: snapshot.exclusions ?? [],
          mapStops: snapshot.mapStops ?? [],

          itinerary: {
            create: (snapshot.itinerary ?? []).map((day) => ({
              dayNumber: day.dayNumber,
              title: day.title,
              description: day.description,
              location: day.location,
              activities: day.activities ?? [],
            })),
          },

          hotels: {
            create: (snapshot.hotels ?? []).map((hotel) => ({
              name: hotel.name,
              location: hotel.location,
              roomType: hotel.roomType,
              description: hotel.description,
              image: hotel.image,
              price: hotel.price,
            })),
          },

          seasonalPrices: {
            create: (snapshot.seasonalPrices ?? []).map((price) => ({
              season: price.season,
              hotelCategory: price.hotelCategory,
              validFrom: new Date(price.validFrom),
              validTo: new Date(price.validTo),
              pricePerPerson: price.pricePerPerson,
              priceTwinSharing: price.priceTwinSharing,
              gstPercentage: price.gstPercentage,
            })),
          },
        },
        include: {
          itinerary: {
            orderBy: { dayNumber: "asc" },
          },
          hotels: true,
          seasonalPrices: true,
        },
      });

      return {
        restoredVersion: selectedVersion.version,
        newVersion: nextVersion,
        package: restoredPackage,
      };
    },
    {
      maxWait: 15000,
      timeout: 30000,
    },
  );
};
