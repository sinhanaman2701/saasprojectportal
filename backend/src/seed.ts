import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@koltepatil.test';
  const password = 'password123';
  
  const existingAdmin = await prisma.admin.findUnique({ where: { email } });
  if (!existingAdmin) {
    const password_hash = await bcrypt.hash(password, 10);
    await prisma.admin.create({
      data: {
        email,
        password_hash
      }
    });
    console.log(`Seeded super admin: ${email} / ${password}`);
  } else {
    console.log('Super admin already exists');
  }

  // Create "Canvas" Project
  const projectName = "Canvas";
  const existingProject = await prisma.project.findFirst({ where: { projectName } });
  
  if (existingProject) {
    console.log('Project "Canvas" already exists. Skipping project seed.');
    return;
  }

  const canvasProject = await prisma.project.create({
    data: {
      projectName: "Canvas",
      description: "Introducing Canvas - A development by Kolte Patil, where a diverse ecosystem of villages and social spaces gathered at the edges of a shaded wadi, each piece bringing its own unique rhythm, yet all belonging to the same whole, within a low-density, sustainable masterplan.",
      location: "Near Hinjwadi, Pune",
      bedrooms: 2,
      bathrooms: 2,
      price: "₹ 82 Lacs",
      furnishing: "Furnished",
      floor: "15th Floor",
      area: "2500 sq.ft",
      thumbnailUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=1000",
      locationIframe: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15129.567439545!2d73.7402!3d18.5913!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2bb08e1ec26a3%3A0x7d025b3a4a1d6368!2sHinjewadi%2C%20Pune%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin",
      projectStatus: "ONGOING",
      attachments: {
        create: [
          { name: "Banner 1", imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=1200", extension: "JPG" },
          { name: "Banner 2", imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200", extension: "JPG" },
          { name: "Banner 3", imageUrl: "https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&q=80&w=1200", extension: "JPG" }
        ]
      },
      communityAmenities: {
        create: [
          { name: "Swimming pool", imageUrl: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=600" },
          { name: "Kids Area", imageUrl: "https://images.unsplash.com/photo-1537162809335-5e367808269e?auto=format&fit=crop&q=80&w=600" },
          { name: "Gymnasium", imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=600" }
        ]
      },
      propertyAmenities: {
        create: [
          { name: "CCTV Cameras" },
          { name: "Parking" },
          { name: "Security" },
          { name: "Power Backup" }
        ]
      },
      nearbyPlaces: {
        create: [
          { category: "Hospital", distanceKm: 0.4 },
          { category: "School", distanceKm: 0.55 },
          { category: "Mall", distanceKm: 1.2 }
        ]
      }
    }
  });

  console.log(`Seeded project: ${canvasProject.projectName}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
