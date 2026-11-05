
import "dotenv/config";
import prisma from "../src/config/database.js";

const roles = [
  {
    name: "ADMIN",
    description: "Full access to all platform features",
    permissions: {
      packages: ["create", "read", "update", "delete"],
      pricing: ["create", "read", "update", "delete"],
      enquiries: ["create", "read", "update", "delete"],
      journal: ["create", "read", "update", "delete", "publish"],
      quotes: ["create", "read", "update", "delete"],
      users: ["create", "read", "update", "delete"],
      activityLogs: ["read"],
    },
  },
  {
    name: "EDITOR",
    description: "Manages packages, pricing and blog content",
    permissions: {
      packages: ["create", "read", "update"],
      pricing: ["create", "read", "update"],
      journal: ["create", "read", "update", "publish"],
    },
  },
  {
    name: "CONSULTANT",
    description: "Manages enquiries and quotations",
    permissions: {
      enquiries: ["create", "read", "update"],
      quotes: ["create", "read", "update"],
    },
  },
];

try {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        description: role.description,
        permissions: role.permissions,
      },
      create: role,
    });

    console.log(`Role ready: ${role.name}`);
  }

  console.log("All staff roles seeded successfully.");
} catch (error) {
  console.error("Role seeding failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
