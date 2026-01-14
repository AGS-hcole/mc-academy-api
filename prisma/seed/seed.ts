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

  // Ensure AppSetting row exists
  const appSetting = await prisma.appSetting.findUnique({
    where: { id: 1 },
  });

  if (!appSetting) {
    await prisma.appSetting.create({
      data: {
        id: 1,
        responseCutoffWeekday: 5,
        responseCutoffHourLocal: 18,
        publishWeekday: 6,
        publishHourLocal: 20,
        autogenWeekday: 5,
        autogenHourLocal: 0,
        residenceCutoffHourLocal: 12,
        residenceCutoffMinuteLocal: 0,
      },
    });
    console.log('AppSetting created with default values');
  }

  // Create a sample Manor if none exist
  const manorCount = await prisma.manor.count();
  if (manorCount === 0) {
    await prisma.manor.create({
      data: {
        name: 'Manoir Principal',
        address: '1 rue des Écoles',
        city: 'Montpellier',
        capacity: 30,
        enforceCapacity: true,
        isActive: true,
      },
    });
    console.log('Sample manor created: Manoir Principal');
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
