
import prisma from "../config/database.js";

export const createEnquiry = async (data) => {
  return prisma.enquiry.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      travelDate: data.travelDate
        ? new Date(`${data.travelDate}T00:00:00.000Z`)
        : null,
      travellers: data.travellers,
      message: data.message || null,
      packageId: data.packageId || null,
      contactConsent: form.consent,
      contactConsentAt: new Date(),
    },
    include: {
      package: {
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
        },
      },
    },
  });
};

export const getAllEnquiries = async (filters = {}) => {
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.priority === "true") {
    where.priority = true;
  }

  if (filters.packageId) {
    where.packageId = filters.packageId;
  }

  return prisma.enquiry.findMany({
    where,
    include: {
      package: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      assignedTo: {
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

export const getEnquiryById = async (id) => {
  return prisma.enquiry.findUnique({
    where: { id },
    include: {
      package: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

export const updateEnquiry = async (id, data) => {
  const allowedStatuses = [
    "NEW",
    "CONTACTED",
    "FOLLOW_UP",
    "QUOTED",
    "CONFIRMED",
    "CANCELLED",
  ];

  const updateData = {};

  if (data.status !== undefined) {
    if (!allowedStatuses.includes(data.status)) {
      throw new Error("Invalid enquiry status");
    }
    updateData.status = data.status;
  }

  if (data.priority !== undefined) {
    updateData.priority = Boolean(data.priority);
  }

  if (data.assignedToId !== undefined) {
    updateData.assignedToId = data.assignedToId || null;
  }

  return prisma.enquiry.update({
    where: { id },
    data: updateData,
    include: {
      package: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

export const deleteEnquiry = async (id) => {
  return prisma.enquiry.delete({
    where: { id },
  });
};
export const checkPublishedPackageExists = async (id) => {
  const result = await prisma.package.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  return result?.status === "PUBLISHED";
};

// Add a private internal note
export const addEnquiryNote = async (enquiryId, content) => {
  return prisma.enquiryNote.create({
    data: {
      content,
      enquiryId,
    },
  });
};

// Get all internal notes for an enquiry
export const getEnquiryNotes = async (enquiryId) => {
  return prisma.enquiryNote.findMany({
    where: { enquiryId },
    orderBy: { createdAt: "desc" },
  });
};

// Record an incoming or outgoing customer message
export const addEnquiryMessage = async (
  enquiryId,
  content,
  direction
) => {
  if (!["INBOUND", "OUTBOUND"].includes(direction)) {
    throw new Error("Direction must be INBOUND or OUTBOUND");
  }

  return prisma.enquiryMessage.create({
    data: {
      content,
      direction,
      enquiryId,
    },
  });
};

// Get communication history
export const getEnquiryMessages = async (enquiryId) => {
  return prisma.enquiryMessage.findMany({
    where: { enquiryId },
    orderBy: { createdAt: "asc" },
  });
};