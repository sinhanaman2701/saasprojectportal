import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth';
import adminProjectRoutes from './routes/admin_projects';
import publicProjectRoutes from './routes/public_projects';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health Check / Root Route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Kolte Patil Backend API Server is running successfully!'
  });
});

// Static S3 Simulation
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/admin/auth', authRoutes);
app.use('/admin/projects', adminProjectRoutes);
app.use('/projects', publicProjectRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Kolte Patil Backend API Server running on port ${PORT}`);
});
