// scripts/reset-password.js
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [, , email, newPlain] = process.argv;
  if (!email || !newPlain) {
    console.error(
      "Usage: node scripts/reset-password.js <email> <newPlainPassword>"
    );
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error("No user found with that email");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPlain, 12);
  await prisma.user.update({ where: { email }, data: { passwordHash } });
  console.log(`Password reset OK for ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
