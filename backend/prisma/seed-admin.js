import "dotenv/config";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import prisma from "../src/config/database.js";

const rl = readline.createInterface({ input, output });

try {
  const name = await rl.question("Enter admin name: ");
  const email = (await rl.question("Enter admin email: "))
    .trim()
    .toLowerCase();

  if (!name.trim() || !email) {
    throw new Error("Name and email are required.");
  }

  const existingAdmin = await prisma.user.findFirst({
    where: {
      role: { name: "ADMIN" },
    },
  });

  if (existingAdmin) {
    throw new Error(
      `An admin account already exists: ${existingAdmin.email}`
    );
  }

  const adminRole = await prisma.role.findUnique({
    where: { name: "ADMIN" },
  });

  if (!adminRole) {
    throw new Error("ADMIN role not found. Run the role seed first.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("A user with this email already exists.");
  }

  const password = crypto.randomBytes(18).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name: name.trim(),
      email,
      passwordHash,
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });

  console.log("\nAdmin account created successfully.");
  console.log("Email:", email);
  console.log("Temporary password:", password);
  console.log("\nSave this password securely. It will not be displayed again.");
} catch (error) {
  console.error("\nAdmin creation failed:", error.message);
  process.exitCode = 1;
} finally {
  rl.close();
  await prisma.$disconnect();
}