import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@saasportal.com';
  const password = 'SuperAdmin@2026';

  // Check if already exists
  const existing = await prisma.superadmin.findUnique({ where: { email } });
  if (existing) {
    console.log('Superadmin already exists:', email);
    console.log('Use this password or reset it via database');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const superadmin = await prisma.superadmin.create({
    data: { email, passwordHash }
  });

  console.log('✅ Created superadmin account:');
  console.log('   Email:', email);
  console.log('   Password:', password);
  console.log('');
  console.log('Login at: http://localhost:3000/admin/login');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
