const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

async function testUpload() {
  // First login
  const loginRes = await fetch('http://localhost:3002/api/koltepatil/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@gmail.com',
      password: 'password123'
    })
  });

  const loginData = await loginRes.json();
  console.log('Login response:', loginData);

  if (loginData.status_code !== 200) {
    console.log('Login failed');
    return;
  }

  const token = loginData.response_data.token;

  // Create test files
  const testDir = '/tmp/saas-test';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const imagePath = path.join(testDir, 'test-image.jpg');
  const pdfPath = path.join(testDir, 'test-brochure.pdf');

  // Create dummy files
  fs.writeFileSync(imagePath, Buffer.from('fake image data'));
  fs.writeFileSync(pdfPath, Buffer.from('fake pdf data'));

  // Create form data
  const form = new FormData();
  form.append('data', JSON.stringify({
    projectName: 'Test Project from Script',
    location: 'Test Location',
    price: '8500000',
    bedrooms: '3',
    area: '1200',
    furnishing: 'Unfurnished',
    projectStatus: 'ONGOING',
    description: 'Test description',
    propertyAmenities: ['CCTV Cameras', 'Reserved Parking'],
    nearbyPlaces: { address: 'Test Address' }
  }));
  form.append('isDraft', 'false');
  form.append('status', 'ONGOING');
  form.append('_fieldKeys', 'bannerImages,brochure');
  form.append('bannerImages', fs.createReadStream(imagePath));
  form.append('brochure', fs.createReadStream(pdfPath));

  // Submit
  const res = await fetch('http://localhost:3002/api/koltepatil/projects', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      ...form.getHeaders()
    },
    body: form.getBuffer()
  });

  const result = await res.json();
  console.log('\nProject creation response:');
  console.log(JSON.stringify(result, null, 2));
}

testUpload().catch(console.error);
