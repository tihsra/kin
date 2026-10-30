import { db } from '../lib/db.ts';
import { donorSchema, profileSchema } from '../models/schemas.ts';

export async function getProfile(userId: string) {
  const { rows } = await db.query(
    `SELECT blood_group,city,radius_km,available,available_until,email_invitations,
    ST_Y(location::geometry) AS latitude,ST_X(location::geometry) AS longitude FROM donor_profiles WHERE user_id=$1`,
    [userId],
  );
  return rows[0] || null;
}
export async function saveDonor(userId: string, input: unknown) {
  const v = donorSchema.parse(input);
  await db.query(
    `INSERT INTO donor_profiles(user_id,blood_group,city,location,radius_km,available,available_until,email_invitations)
    VALUES($1,$2,$3,ST_SetSRID(ST_MakePoint($4,$5),4326)::geography,$6,$7,$8,$9)
    ON CONFLICT(user_id) DO UPDATE SET blood_group=excluded.blood_group,city=excluded.city,location=excluded.location,
    radius_km=excluded.radius_km,available=excluded.available,available_until=excluded.available_until,
    email_invitations=excluded.email_invitations,updated_at=now()`,
    [
      userId,
      v.blood_group,
      v.city,
      v.longitude,
      v.latitude,
      v.radius_km,
      v.available,
      v.available_until,
      v.email_invitations,
    ],
  );
  return getProfile(userId);
}
export async function saveProfile(userId: string, input: unknown) {
  const v = profileSchema.parse(input);
  await db.query('UPDATE users SET name=$1,phone=$2 WHERE id=$3', [
    v.name,
    v.phone || null,
    userId,
  ]);
  return { message: 'Profile saved' };
}
