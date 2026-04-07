import express from 'express';
import { Router } from 'express';
import tenantAuthRoutes from './src/routes/tenant_auth';
import tenantProjectRoutes from './src/routes/tenant_projects';

const app = express();
app.use(express.json());
app.use((req, res, next) => { console.log('CAUGHT:', req.method, req.path, 'baseUrl:', req.baseUrl); next(); });

// Debug: add a middleware that wraps the router
const debugRouter = Router();
debugRouter.use((req, res, next) => {
  console.log('DEBUG_ROUTER: baseUrl:', req.baseUrl, 'path:', req.path, 'params:', JSON.stringify(req.params));
  next();
});
debugRouter.use(tenantAuthRoutes);
debugRouter.use(tenantProjectRoutes);

app.use('/api', debugRouter);

app.listen(3017, () => console.log('ready on 3017'));
