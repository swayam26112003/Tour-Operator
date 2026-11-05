import "dotenv/config";
import prisma from "../src/config/database.js";

try {
  const user = await prisma.user.findUnique({
    where: {
      email: "swayampandey181@gmail.com",
    },
    include: {
      role: true,
    },
  });

  if (!user) {
    console.log("ADMIN USER NOT FOUND");
  } else {
    console.log({
      id: user.id,
      email: user.email,
      status: user.status,
      role: user.role?.name,
      hasPasswordHash: Boolean(user.passwordHash),
    });
  }
} catch (error) {
  console.error("Diagnostic failed:", error.message);
} finally {
  await prisma.$disconnect();
}