
import prisma from "./src/config/database.js";

try {
  console.log(
    "Models:",
    Object.keys(prisma._runtimeDataModel.models)
  );

  console.log(
    "Package delegate:",
    typeof prisma.package
  );
} catch (error) {
  console.error("Prisma check failed:", error);
} finally {
  await prisma.$disconnect();
}
