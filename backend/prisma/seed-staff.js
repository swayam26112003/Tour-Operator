
import "dotenv/config";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import prisma from "../src/config/database.js";

const staff = [
  {
    name: "Test Editor",
    email: "editor.test@touroperator.local",
    roleName: "EDITOR",
  },
  {
    name: "Test Consultant",
    email: "consultant.test@touroperator.local",
    roleName: "CONSULTANT",
  },
];

try {
  for (const member of staff) {
    const existing = await prisma.user.findUnique({
      where: { email: member.email },
    });

    if (existing) {
      console.log(`Already exists: ${member.email}`);
      continue;
    }

    const role = await prisma.role.findUnique({
      where: { name: member.roleName },
    });

    if (!role) {
      throw new Error(`Role not found: ${member.roleName}`);
    }

    const password = crypto.randomBytes(24).toString("base64url");
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        name: member.name,
        email: member.email,
        passwordHash,
        roleId: role.id,
        status: "ACTIVE",
      },
    });

    console.log(`\nCreated: ${member.roleName}`);
    console.log(`Email: ${member.email}`);
    console.log(`Temporary password: ${password}`);
  }

  console.log("\nStaff seeding completed.");
} catch (error) {
  console.error("Staff seeding failed:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
