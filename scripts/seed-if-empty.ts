import { PrismaClient } from "@prisma/client";
import { seedDefaults } from "../prisma/seed";

const prisma = new PrismaClient();

async function main() {
  const [userCount, templateCount] = await Promise.all([prisma.user.count(), prisma.aiTemplate.count()]);

  if (userCount > 0 && templateCount > 0) {
    console.log("Seed skipped: users and templates already exist.");
    return;
  }

  await seedDefaults(prisma);
  console.log("Seed completed: default admin and templates are ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
