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
    select: {
      key: true,
      label: true,
      type: true,
      required: true,
    },
  });

  console.log('Fields that are required:');
  fields.filter(f => f.required).forEach(f => {
    console.log(`  - ${f.key} (${f.type})`);
  });

  // Check what the validation module sees
  console.log('\n--- Testing attachments check ---');
  const attachments = {
    bannerImages: [{ url: 'http://test.com/img1.jpg', order: 0, isCover: true }],
    brochure: [{ url: 'http://test.com/brochure.pdf', order: 0, isCover: false }],
  };

  const bannerField = fields.find(f => f.key === 'bannerImages');
  console.log('bannerField:', bannerField);
  console.log('attachments.bannerImages:', attachments.bannerImages);
  console.log('attachments.bannerImages?.length:', attachments.bannerImages?.length);

  const isFileField = bannerField?.type === 'IMAGE' || bannerField?.type === 'IMAGE_MULTI' || bannerField?.type === 'FILE';
  console.log('isFileField:', isFileField);

  const hasFiles = attachments && attachments['bannerImages'] && attachments['bannerImages'].length > 0;
  console.log('hasFiles:', hasFiles);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
