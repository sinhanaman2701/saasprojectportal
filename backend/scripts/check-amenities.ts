import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const field = await prisma.tenantField.findFirst({
    where: { tenantId: 2, key: 'propertyAmenities' }
  });

  if (!field) {
    console.log('Field not found');
    return;
  }

  console.log('Options:', field.options);
  console.log('Type:', typeof field.options);
  console.log('Is array:', Array.isArray(field.options));
  if (Array.isArray(field.options)) {
    console.log('Elements:');
    field.options.forEach((o: any, i: number) => {
      console.log(`  ${i}: ${JSON.stringify(o)} (type: ${typeof o})`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
