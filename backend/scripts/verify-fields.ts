import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'koltepatil' }
  });

  if (!tenant) {
    console.log('Tenant koltepatil not found');
    return;
  }

  const fields = await prisma.tenantField.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ section: 'asc' }, { order: 'asc' }]
  });

  // Output as the API would return it
  console.log(JSON.stringify({
    status_code: 200,
    status_message: 'Success',
    response_data: fields
  }, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
