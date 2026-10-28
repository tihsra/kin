import { z } from 'zod';

export const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export const components = ['Whole blood', 'Red cells', 'Platelets', 'Plasma'] as const;
const coordinates = {
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
};
const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number')
  .nullable()
  .optional();
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().toLowerCase(),
  password: z.string().min(10).max(128),
});
export const loginSchema = registerSchema.pick({ email: true, password: true });
export const profileSchema = z.object({ name: z.string().trim().min(2).max(80), phone });
export const donorSchema = z
  .object({
    blood_group: z.enum(bloodGroups),
    city: z.string().trim().min(2).max(80),
    ...coordinates,
    radius_km: z.number().int().min(1).max(500),
    available: z.boolean(),
    available_until: z.iso.datetime({ offset: true }).nullable(),
    email_invitations: z.boolean(),
  })
  .refine(
    (value) => !value.available_until || new Date(value.available_until).getTime() > Date.now(),
    {
      message: 'Availability must end in the future',
      path: ['available_until'],
    },
  );
export const requestSchema = z.object({
  hospital: z.string().trim().min(2).max(160),
  destination: z.string().trim().min(4).max(240),
  city: z.string().trim().min(2).max(80),
  ...coordinates,
  blood_group: z.enum(bloodGroups),
  component: z.enum(components),
  quantity: z.string().trim().max(80).nullable().optional(),
  target: z.number().int().min(1).max(20),
  deadline: z.iso.datetime({ offset: true }),
  instructions: z.string().trim().max(2000),
  checked_instructions: z.boolean(),
});
export const offerSchema = z
  .object({
    arrival_start: z.iso.datetime({ offset: true }),
    arrival_end: z.iso.datetime({ offset: true }),
    note: z.string().trim().max(400).default(''),
  })
  .refine(
    (v) => new Date(v.arrival_end) > new Date(v.arrival_start),
    'Arrival window must end after it starts',
  );
export function assertArrival(start: string, end: string, deadline: string, now = Date.now()) {
  return (
    new Date(start).getTime() >= now &&
    new Date(end).getTime() > new Date(start).getTime() &&
    new Date(end).getTime() <= new Date(deadline).getTime()
  );
}
export type RequestInput = z.infer<typeof requestSchema>;
