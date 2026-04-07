import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'koltepatil' }
  });

  if (!tenant) return;

  const fields = await prisma.tenantField.findMany({
    where: { tenantId: tenant.id },
    select: {
      key: true,
      label: true,
      type: true,
      required: true,
    },
  });

  const attachments: Record<string, any> = {
    bannerImages: [{ url: 'http://test.com/img1.jpg', order: 0, isCover: true }],
    brochure: [{ url: 'http://test.com/brochure.pdf', order: 0, isCover: false }],
  };

  console.log('Simulating validation logic:\n');

  for (const field of fields) {
    if (field.required) {
      const isFileField = field.type === 'IMAGE' || field.type === 'IMAGE_MULTI' || field.type === 'FILE';

      if (isFileField) {
        const hasFiles = attachments && attachments[field.key] && attachments[field.key].length > 0;
        console.log(`${field.key} (${field.type}): hasFiles=${hasFiles}`);
        if (!hasFiles) {
          console.log(`  -> Would error: ${field.label} is required`);
        }
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
