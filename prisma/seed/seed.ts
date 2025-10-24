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

  // Seed public events
  const existingEvents = await prisma.publicEvent.findMany();
  if (existingEvents.length === 0) {
    const now = new Date();
    const pastDate = new Date(now);
    pastDate.setDate(now.getDate() - 7);
    const futureStart = new Date(now);
    futureStart.setDate(now.getDate() + 30);
    const futureEnd = new Date(futureStart);
    futureEnd.setDate(futureStart.getDate() + 7);

    await prisma.publicEvent.createMany({
      data: [
        {
          slug: 'adults-training-camp',
          name: 'Adults Training Camp',
          description: 'Intensive training camp for adults with professional coaches.',
          startTime: pastDate,
          endTime: futureEnd,
          backgroundImageUrl: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8',
          externalRegistrationUrl: 'https://forms.gle/example-adults-camp',
          isPublished: true,
          orderIndex: 10,
        },
        {
          slug: 'kids-summer-camp',
          name: 'Kids Summer Camp',
          description: 'Fun summer camp activities for kids aged 8-14.',
          startTime: futureStart,
          endTime: futureEnd,
          backgroundImageUrl: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff',
          externalRegistrationUrl: 'https://forms.gle/example-kids-camp',
          isPublished: true,
          orderIndex: 20,
        },
        {
          slug: 'open-group-class',
          name: 'Open Group Class',
          description: 'Regular open group classes for all skill levels. No fixed schedule.',
          backgroundImageUrl: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6',
          externalRegistrationUrl: 'https://forms.gle/example-open-class',
          isPublished: true,
          orderIndex: 30,
        },
      ],
    });

    console.log('3 public events seeded successfully');
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
