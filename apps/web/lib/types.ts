export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  verified_at: string | null;
  role: 'member' | 'admin';
};
export type BloodRequest = {
  id: string;
  owner_id: string;
  hospital: string;
  destination: string;
  city: string;
  blood_group: string;
  component: string;
  quantity: string | null;
  target: number;
  confirmed: number;
  deadline: string;
  instructions: string;
  checked_instructions: boolean;
  latitude: number;
  longitude: number;
  status: string;
  outreach_exhausted: boolean;
};
export type DonorProfile = {
  blood_group: string;
  city: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  available: boolean;
  available_until: string | null;
  email_invitations: boolean;
};
export const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const components = ['Whole blood', 'Red cells', 'Platelets', 'Plasma'];
export function date(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
