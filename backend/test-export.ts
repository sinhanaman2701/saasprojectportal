import tenantAuthRoutes from './src/routes/tenant_auth';
import { Router } from 'express';

const r = tenantAuthRoutes as Router;
console.log('tenantAuthRoutes stack length:', r.stack ? r.stack.length : 'no stack');
console.log('tenantAuthRoutes routes:', JSON.stringify(Object.keys(r)));
r.stack?.forEach((layer: any, i: number) => {
  console.log(`  layer ${i}: path=${layer.route?.path || 'middleware'}, regexp=${layer.regexp}`);
});
