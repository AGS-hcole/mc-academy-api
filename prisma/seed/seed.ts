import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

export async function main() {
  const bcpass = bcryptjs.hashSync(process.env.DEFAULT_PW, 10);

  const users = await prisma.user.findMany();

  if (users.length === 0) {
    await prisma.user.createMany({
      data: [
        {
          firstname: process.env.DEFAULT_FIRSTNAME!,
          lastname: process.env.DEFAULT_LASTNAME!,
          email: process.env.DEFAULT_EMAIL!,
          password: bcpass,
          role: 'admin',
        },
      ],
    });

    console.log(
      'User created',
      process.env.DEFAULT_FIRSTNAME! + ' ' + process.env.DEFAULT_LASTNAME!,
    );
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // close Prisma Client at the end
    await prisma.$disconnect();
  });
