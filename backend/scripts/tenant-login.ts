import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Check if Kolte Patil tenant exists
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'koltepatil' }
  });

  if (!tenant) {
    console.log('Tenant koltepatil not found');
    return;
  }

  console.log(`Tenant: ${tenant.name} (ID: ${tenant.id})`);

  // Check if tenant admin exists
  const admin = await prisma.tenantAdmin.findFirst({
    where: { tenantId: tenant.id }
  });

  if (!admin) {
    console.log('No tenant admin found. Creating one...');
    const password = 'password123';
    const passwordHash = await bcrypt.hash(password, 12);

    const newAdmin = await prisma.tenantAdmin.create({
      data: {
        email: 'admin@koltepatil.test',
        passwordHash,
        tenantId: tenant.id
      }
    });

    console.log(`Created tenant admin: ${newAdmin.email}`);
    console.log(`Password: password123`);
  } else {
    console.log(`Tenant admin exists: ${admin.email}`);
    console.log(`Resetting password to: password123`);

    const passwordHash = await bcrypt.hash('password123', 12);
    await prisma.tenantAdmin.update({
      where: { id: admin.id },
      data: { passwordHash }
    });
  }

  console.log('\nLogin credentials:');
  console.log('  Email: admin@koltepatil.test');
  console.log('  Password: password123');
  console.log('  URL: http://localhost:3000/koltepatil/login');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
