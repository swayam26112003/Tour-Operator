
import bcrypt from "bcryptjs";
import prisma from "../config/database.js";

export const createUser = async ({
  name,
  email,
  phone,
  password,
  roleName,
}) => {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new Error("A user with this email already exists.");
  }

  const role = await prisma.role.findUnique({
    where: { name: roleName },
  });

  if (!role || !["ADMIN", "EDITOR", "CONSULTANT"].includes(roleName)) {
    throw new Error("Invalid user role.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      phone: phone || null,
      passwordHash,
      roleId: role.id,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      role: {
        select: {
          name: true,
        },
      },
      createdAt: true,
    },
  });
};

export const getAllUsers = async () => {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      role: {
        select: {
          name: true,
        },
      },
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const updateUser = async (userId, data) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const updateData = {};

  if (data.name !== undefined) {
    updateData.name = data.name.trim();
  }

  if (data.phone !== undefined) {
    updateData.phone = data.phone || null;
  }

  if (data.status !== undefined) {
    if (!["ACTIVE", "INACTIVE"].includes(data.status)) {
      throw new Error("Invalid user status.");
    }

    updateData.status = data.status;
  }

  if (data.roleName !== undefined) {
    const role = await prisma.role.findUnique({
      where: { name: data.roleName },
    });

    if (!role) {
      throw new Error("Invalid user role.");
    }

    updateData.roleId = role.id;
  }

  if (data.password !== undefined) {
    if (data.password.length < 8) {
      throw new Error("Password must contain at least 8 characters.");
    }

    updateData.passwordHash = await bcrypt.hash(data.password, 12);
  }

  return prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      role: {
        select: {
          name: true,
        },
      },
      updatedAt: true,
    },
  });
};

export const deleteUser = async (userId, currentUserId) => {
  if (userId === currentUserId) {
    throw new Error("You cannot delete your own account.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.role.name === "ADMIN") {
    const adminCount = await prisma.user.count({
      where: {
        status: "ACTIVE",
        role: { name: "ADMIN" },
      },
    });

    if (adminCount <= 1) {
      throw new Error("Cannot delete the last active administrator.");
    }
  }

  return prisma.user.delete({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
};
