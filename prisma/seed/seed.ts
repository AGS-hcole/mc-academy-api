import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

export async function main() {
  const bcpass = bcryptjs.hashSync(process.env.DEFAULT_PW || 'password123', 10);

  // Create users
  const users = await prisma.user.findMany();

  if (users.length === 0) {
    await prisma.user.createMany({
      data: [
        {
          firstname: process.env.DEFAULT_FIRSTNAME || 'Admin',
          lastname: process.env.DEFAULT_LASTNAME || 'User',
          email: process.env.DEFAULT_EMAIL || 'admin@example.com',
          password: bcpass,
          role: 'admin',
        },
        {
          firstname: 'Student',
          lastname: 'One',
          email: 'student1@example.com',
          password: bcpass,
          role: 'user',
        },
        {
          firstname: 'Student',
          lastname: 'Two',
          email: 'student2@example.com',
          password: bcpass,
          role: 'user',
        },
      ],
    });

    console.log('Users created');
  }

  // Create or update AppSetting with planning window
  await prisma.appSetting.upsert({
    where: { id: 1 },
    update: {
      planWindowOpenWeekday: 6, // Saturday
      planWindowOpenHourLocal: 0, // 00:00
      planWindowCloseWeekday: 7, // Sunday
      planWindowCloseHourLocal: 23, // 23:59
      planWindowCloseMinuteLocal: 59,
    },
    create: {
      id: 1,
      responseCutoffWeekday: 5,
      responseCutoffHourLocal: 18,
      publishWeekday: 6,
      publishHourLocal: 20,
      autogenWeekday: 5,
      autogenHourLocal: 0,
      planWindowOpenWeekday: 6,
      planWindowOpenHourLocal: 0,
      planWindowCloseWeekday: 7,
      planWindowCloseHourLocal: 23,
      planWindowCloseMinuteLocal: 59,
    },
  });

  console.log('AppSetting configured with planning window');

  // Create schools
  const schoolCount = await prisma.school.count();
  if (schoolCount === 0) {
    await prisma.school.createMany({
      data: [
        {
          name: 'School A',
          address: '123 Main Street',
          city: 'Paris',
          isActive: true,
        },
        {
          name: 'School B',
          address: '456 Second Avenue',
          city: 'Paris',
          isActive: true,
        },
        {
          name: 'School C',
          address: '789 Third Boulevard',
          city: 'Versailles',
          isActive: true,
        },
      ],
    });

    console.log('Schools created');
  }

  // Create transport templates
  const templateCount = await prisma.transportTemplate.count();
  if (templateCount === 0) {
    const schools = await prisma.school.findMany();
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' },
    });

    if (schools.length > 0 && adminUser) {
      await prisma.transportTemplate.createMany({
        data: [
          {
            name: 'Manor to School A - Morning',
            direction: 'GO',
            originLabel: 'Manor',
            destinationId: schools[0].id,
            targetTime: '07:45',
            capacity: 8,
            daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
            defaultDriverId: adminUser.id,
            defaultVehicle: 'Van 1',
          },
          {
            name: 'School A to Manor - Evening',
            direction: 'RETURN',
            originLabel: 'School A',
            destinationId: schools[0].id,
            targetTime: '17:30',
            capacity: 8,
            daysOfWeek: [1, 2, 3, 4, 5],
            defaultDriverId: adminUser.id,
            defaultVehicle: 'Van 1',
          },
          {
            name: 'Manor to School B - Morning',
            direction: 'GO',
            originLabel: 'Manor',
            destinationId: schools[1].id,
            targetTime: '08:00',
            capacity: 6,
            daysOfWeek: [1, 2, 3, 4, 5],
            defaultVehicle: 'Van 2',
          },
          {
            name: 'School B to Manor - Evening',
            direction: 'RETURN',
            originLabel: 'School B',
            destinationId: schools[1].id,
            targetTime: '18:00',
            capacity: 6,
            daysOfWeek: [1, 2, 3, 4, 5],
            defaultVehicle: 'Van 2',
          },
        ],
      });

      console.log('Transport templates created');
    }
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
