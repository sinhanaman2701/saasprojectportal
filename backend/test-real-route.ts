import express from 'express';
import { Router } from 'express';
import superadminAuth from './src/middleware/superadminAuth';

const app = express();
app.use(express.json());
app.use((req, res, next) => { console.log('CAUGHT:', req.method, req.path); next(); });

// Replicate the exact setup using actual files
import tenantAuthRoutes from './src/routes/tenant_auth';
import tenantProjectRoutes from './src/routes/tenant_projects';

app.use('/api', tenantAuthRoutes);
app.use('/api', tenantProjectRoutes);

app.listen(3016, () => console.log('ready on 3016'));
