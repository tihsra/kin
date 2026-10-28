import { z } from 'zod';

export const config = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    APP_ORIGIN: z
      .url()
      .default('http://localhost:3000')
      .refine((value) => {
        const url = new URL(value);
        return (
          ['http:', 'https:'].includes(url.protocol) &&
          !url.username &&
          !url.password &&
          !url.search &&
          !url.hash &&
          url.pathname === '/'
        );
      }, 'APP_ORIGIN must be an HTTP origin without a path, credentials, or query.')
      .transform((value) => new URL(value).origin),
    DATABASE_URL: z.string().min(1, 'Set DATABASE_URL in .env'),
    DATABASE_DIRECT_URL: z.url().optional(),
    HOST: z.string().default('0.0.0.0'),
    TRUST_PROXY: z
      .string()
      .default('false')
      .transform((value) =>
        value === 'false'
          ? false
          : /^\d+$/.test(value)
            ? Number(value)
            : value.split(',').map((part) => part.trim()),
      ),
    DATABASE_SSL: z.enum(['true', 'false']).default('false'),
    MAIL_MODE: z.enum(['resend', 'brevo']).default('brevo'),
    MAIL_API_KEY: z.string().min(1),
    MAIL_FROM: z.string().min(1),
    OTP_SECRET: z.string().min(32),
    OUTREACH_RADII: z
      .string()
      .default('5,15,30')
      .transform((value) => value.split(',').map(Number))
      .pipe(z.array(z.number().positive().max(500)).min(1).max(6))
      .refine(
        (values) => values.every((value, index) => !index || value > values[index - 1]),
        'Outreach radii must increase',
      ),
    OUTREACH_BATCH_SIZE: z.coerce.number().int().min(1).max(50).default(10),
    OUTREACH_WAIT_MINUTES: z.coerce.number().min(1).max(120).default(10),
    INVITATION_EXPIRY_MINUTES: z.coerce.number().min(1).max(1440).default(30),
    INVITATION_DAILY_LIMIT: z.coerce.number().int().min(1).max(20).default(3),
  })
  .parse(process.env);

if (config.NODE_ENV === 'production') {
  if (new URL(config.APP_ORIGIN).protocol !== 'https:') {
    throw new Error('APP_ORIGIN must use HTTPS in production.');
  }
  if (config.DATABASE_SSL !== 'true') {
    throw new Error('Enable DATABASE_SSL for the production database.');
  }
}
export const otpSecret = config.OTP_SECRET;
