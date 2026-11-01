import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { loadSession, originGuard } from './middleware/auth.ts';
import { router } from './routes/index.ts';
import { AppError } from './lib/errors.ts';
import { config } from './config.ts';
import { db } from './lib/db.ts';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.TRUST_PROXY);
app.use((req, res, next) => {
  res.setHeader('X-Request-Id', crypto.randomUUID());
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok' });
});
app.get('/api/v1/ready', async (_req, res) => {
  await db.query('SELECT 1');
  res.json({ status: 'ready' });
});
app.use(express.json({ limit: '32kb' }));
app.use('/api/v1', loadSession, originGuard, router);
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});
const errors: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: error.issues.map((i) => `${i.path.join('.') || 'Input'}: ${i.message}`).join('. '),
    });
    return;
  }
  if (error instanceof AppError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (error?.code === '23505') {
    res
      .status(409)
      .json({ error: 'This action conflicts with an existing record. Refresh and try again.' });
    return;
  }
  if (error?.type === 'entity.too.large') {
    res.status(413).json({ error: 'Request body is too large' });
    return;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }
  console.error(
    JSON.stringify({
      event: 'request_failed',
      requestId: res.getHeader('X-Request-Id'),
      path: req.path,
      code: error?.code || 'unknown',
    }),
  );
  res.status(503).json({ error: 'The service is temporarily unavailable. Please try again.' });
};
app.use(errors);
