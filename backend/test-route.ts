import express from 'express';
import { Router } from 'express';
import tenantMiddleware from './src/middleware/tenant';

const app = express();
app.use(express.json());

const router = Router();
router.post('/:slug/auth/login', tenantMiddleware, (req, res) => {
  console.log('ROUTE HIT: params.slug =', req.params.slug);
  res.json({ params: req.params, tenant: req.tenant });
});

app.use('/api', router);

app.listen(3015, () => console.log('ready'));
