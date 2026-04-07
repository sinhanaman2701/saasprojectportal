import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find Kolte Patil tenant
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'koltepatil' }
  });

  if (!tenant) {
    console.log('Tenant koltepatil not found');
    return;
  }

  console.log(`Tenant: ${tenant.name} (ID: ${tenant.id})\n`);

  const fields = await prisma.tenantField.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ section: 'asc' }, { order: 'asc' }]
  });

  console.log('Fields:');
  fields.forEach(f => {
    console.log(`  - ${f.key} (${f.type}) - Section: ${f.section}, Required: ${f.required}`);
    if (f.options) {
      console.log(`    Options: ${typeof f.options === 'string' ? f.options : JSON.stringify(f.options)}`);
    }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
