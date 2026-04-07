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

  console.log(`Tenant: ${tenant.name} (ID: ${tenant.id})\n`);

  // Check legacy Project table
  const legacyProjects = await prisma.project.findMany({
    take: 5
  });

  console.log('Legacy Projects (Project table):');
  legacyProjects.forEach(p => {
    console.log(`  - ${p.projectName} (ID: ${p.id})`);
  });

  // Check new TenantProject table
  const newProjects = await prisma.tenantProject.findMany({
    where: { tenantId: tenant.id },
    take: 5
  });

  console.log('\nNew Projects (TenantProject table):');
  newProjects.forEach(p => {
    const data = p.data as any;
    console.log(`  - ${data?.projectName || 'Untitled'} (ID: ${p.id})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
