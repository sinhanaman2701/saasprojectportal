import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'koltepatil' } });
  if (!tenant) return;

  const fields = await prisma.tenantField.findMany({
    where: { tenantId: tenant.id },
    select: { key: true, type: true, showInList: true }
  });

  console.log('Fields:');
  fields.forEach(f => {
    if (['bannerImages', 'brochure', 'communityAmenities', 'communityImages'].includes(f.key)) {
      console.log(`  ${f.key}: ${f.type} (showInList: ${f.showInList})`);
    }
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
