
import prisma from "../config/database.js";
import { randomUUID } from "node:crypto";

function generateQuoteNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `QT-${year}${month}${day}-${Date.now().toString().slice(-6)}`;
}

function generateShareToken() {
  return `${randomUUID()}${randomUUID()}`.replaceAll("-", "");
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function calculateGst(subtotal, discount, gstPercentage) {
  return roundMoney(
    ((subtotal - discount) * gstPercentage) / 100
  );
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one quotation item is required");
  }

  for (const item of items) {
    if (
      !item.description ||
      !Number.isInteger(Number(item.quantity)) ||
      Number(item.quantity) < 1 ||
      !Number.isFinite(Number(item.unitPrice)) ||
      Number(item.unitPrice) < 0
    ) {
      throw new Error(
        "Each quote item needs a description, valid quantity and non-negative unit price"
      );
    }
  }
}

async function getSeasonalPrice({
  packageId,
  travelDate,
  travelSeason,
  hotelCategory,
}) {
  if (!packageId) return null;

  if (!travelDate || !travelSeason || !hotelCategory) {
    throw new Error(
      "Package quotations require travelDate, travelSeason and hotelCategory"
    );
  }

  const parsedTravelDate = new Date(travelDate);

  if (Number.isNaN(parsedTravelDate.getTime())) {
    throw new Error("Invalid travel date");
  }

  const packageData = await prisma.package.findUnique({
    where: { id: packageId },
    select: {
      id: true,
      title: true,
      slug: true,
      destination: true,
      duration: true,
      seasonalPrices: true,
    },
  });

  if (!packageData) {
    throw new Error("Selected package does not exist");
  }

  const seasonalPrice = await prisma.packageSeasonalPrice.findFirst({
    where: {
      packageId,
      season: travelSeason,
      hotelCategory,
      validFrom: {
        lte: parsedTravelDate,
      },
      validTo: {
        gte: parsedTravelDate,
      },
    },
    orderBy: {
      validFrom: "desc",
    },
  });

  if (!seasonalPrice) {
    throw new Error(
      `No seasonal price found for ${packageData.title}, ${travelSeason}, ${hotelCategory}, on ${parsedTravelDate.toISOString().slice(0, 10)}`
    );
  }

  return {
    packageData,
    seasonalPrice,
  };
}

export async function createQuote(data, userId = null) {
  const {
    packageId,
    enquiryId,
    travellerName,
    travellerEmail,
    travellerPhone,
    travelDate,
    returnDate,
    numberOfAdults = 1,
    numberOfChildren = 0,
    hotelCategory,
    travelSeason,
    pricingBasis = "PER_PERSON",
    currency = "INR",
    discountAmount = 0,
    validUntil,
    notes,
    terms,
    snapshot = {},
    items = [],
  } = data;

  // Basic validation
  if (!travellerName || !travellerEmail || !travellerPhone) {
    throw new Error(
      "Traveller name, email and phone are required"
    );
  }

  if (!validUntil) {
    throw new Error("Quote validity date is required");
  }

  const parsedValidUntil = new Date(validUntil);

  if (Number.isNaN(parsedValidUntil.getTime())) {
    throw new Error("Invalid quotation validity date");
  }

  if (
    !Number.isInteger(Number(numberOfAdults)) ||
    Number(numberOfAdults) < 1 ||
    !Number.isInteger(Number(numberOfChildren)) ||
    Number(numberOfChildren) < 0
  ) {
    throw new Error("Invalid number of adults or children");
  }

  if (!["PER_PERSON", "TWIN_SHARING"].includes(pricingBasis)) {
    throw new Error("Invalid pricing basis");
  }

  if (packageId && currency !== "INR") {
    throw new Error(
      "Package seasonal prices are stored in INR. Only INR quotations are supported for package pricing."
    );
  }

  validateItems(items);

  if (Number(discountAmount) < 0) {
    throw new Error("Discount cannot be negative");
  }

  // Fetch actual package and seasonal pricing.
  const pricingData = await getSeasonalPrice({
    packageId,
    travelDate,
    travelSeason,
    hotelCategory,
  });

  let finalItems = items.map((item) => ({
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
  }));

  let finalGstPercentage = Number(data.gstPercentage ?? 5);
  let finalSnapshot = { ...snapshot };

  if (pricingData) {
    const { packageData, seasonalPrice } = pricingData;

    const pricePerPerson = Number(seasonalPrice.pricePerPerson);
    const priceTwinSharing = Number(seasonalPrice.priceTwinSharing);

    finalGstPercentage = Number(seasonalPrice.gstPercentage);

    const selectedUnitPrice =
      pricingBasis === "TWIN_SHARING"
        ? priceTwinSharing
        : pricePerPerson;

    // The first item represents the package itself.
    // Its price always comes from the database.
    finalItems[0] = {
      ...finalItems[0],
      unitPrice: selectedUnitPrice,
    };

    // Save the actual database prices in the quotation snapshot.
    finalSnapshot = {
      ...snapshot,
      packageTitle: packageData.title,
      destination: packageData.destination,
      duration: packageData.duration,
      hotelCategory,
      travelSeason,
      pricingBasis,
      pricePerPerson,
      priceTwinSharing,
      selectedUnitPrice,
      gstPercentage: finalGstPercentage,
      seasonalPriceId: seasonalPrice.id,
    };
  }

  // Calculate all totals on the backend.
  const calculatedSubtotal = roundMoney(
    finalItems.reduce(
      (sum, item) =>
        sum + item.quantity * item.unitPrice,
      0
    )
  );

  const finalDiscount = roundMoney(Number(discountAmount));

  if (finalDiscount > calculatedSubtotal) {
    throw new Error(
      "Discount cannot exceed the quotation subtotal"
    );
  }

  const calculatedGst = calculateGst(
    calculatedSubtotal,
    finalDiscount,
    finalGstPercentage
  );

  const calculatedTotal = roundMoney(
    calculatedSubtotal - finalDiscount + calculatedGst
  );

  // Verify optional enquiry.
  if (enquiryId) {
    const enquiryExists = await prisma.enquiry.findUnique({
      where: { id: enquiryId },
      select: { id: true },
    });

    if (!enquiryExists) {
      throw new Error("Selected enquiry does not exist");
    }
  }

  // Create quotation.
  return prisma.quote.create({
    data: {
      quoteNumber: generateQuoteNumber(),
      shareToken: generateShareToken(),

      travellerName,
      travellerEmail,
      travellerPhone,

      travelDate: travelDate ? new Date(travelDate) : null,
      returnDate: returnDate ? new Date(returnDate) : null,

      numberOfAdults: Number(numberOfAdults),
      numberOfChildren: Number(numberOfChildren),

      hotelCategory: hotelCategory || null,
      travelSeason: travelSeason || null,

      currency,

      subtotal: calculatedSubtotal,
      discountAmount: finalDiscount,
      gstPercentage: finalGstPercentage,
      gstAmount: calculatedGst,
      totalAmount: calculatedTotal,

      validUntil: parsedValidUntil,

      notes,
      terms,

      snapshot: finalSnapshot,

      ...(packageId && {
        package: {
          connect: { id: packageId },
        },
      }),

      ...(enquiryId && {
        enquiry: {
          connect: { id: enquiryId },
        },
      }),

      ...(userId && {
        createdBy: {
          connect: { id: userId },
        },
      }),

      items: {
        create: finalItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: roundMoney(
            item.quantity * item.unitPrice
          ),
        })),
      },
    },

    include: {
      items: true,

      package: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },

      enquiry: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getAllQuotes(filters = {}) {
  const where = {};

  if (filters.status) where.status = filters.status;
  if (filters.packageId) where.packageId = filters.packageId;
  if (filters.enquiryId) where.enquiryId = filters.enquiryId;

  return prisma.quote.findMany({
    where,
    include: {
      items: true,

      package: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },

      enquiry: {
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
}

export async function getQuoteById(id) {
  return prisma.quote.findUnique({
    where: { id },
    include: {
      items: true,
      package: true,
      enquiry: true,

      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getPublicQuoteByToken(token) {
  const quote = await prisma.quote.findUnique({
    where: {
      shareToken: token,
    },
    include: {
      items: true,

      package: {
        select: {
          title: true,
          destination: true,
          duration: true,
        },
      },
    },
  });

  if (!quote) return null;

  if (quote.status === "DRAFT") return null;

  if (new Date(quote.validUntil) < new Date()) {
    return null;
  }

  return quote;
}

export async function updateQuoteStatus(id, status) {
  const allowedStatuses = [
    "DRAFT",
    "SENT",
    "ACCEPTED",
    "REJECTED",
    "EXPIRED",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error("Invalid quote status");
  }

  return prisma.quote.update({
    where: { id },
    data: { status },
    include: {
      items: true,
    },
  });
}

export async function deleteQuote(id) {
  return prisma.quote.delete({
    where: { id },
  });
}
