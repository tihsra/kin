export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  verified_at: string | null;
  role: 'member' | 'admin';
};
export type RequestStatus = 'draft' | 'open' | 'covered' | 'fulfilled' | 'cancelled' | 'expired';
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
  deadline: string;
  instructions: string;
  checked_instructions: boolean;
  status: RequestStatus;
  outreach_exhausted: boolean;
  confirmed: number;
  created_at: string;
  published_at: string | null;
  latitude: number;
  longitude: number;
};
export interface QueryResult<T = Record<string, any>> {
  rows: T[];
  rowCount: number | null;
}
export interface Database {
  query<T = Record<string, any>>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
}
export interface Connection extends Database {
  release(): void;
}
export interface Pool extends Database {
  on(event: 'error', listener: (error: Error) => void): this;
  connect(): Promise<Connection>;
  end(): Promise<void>;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      csrf?: string;
      sessionHash?: string;
    }
  }
}
