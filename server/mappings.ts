// Backend type definitions for Portfolio API responses
export interface PropertyOut {
  id: number;
  name: string | null;
  type: string | null;
  class: string | null;
  street_1: string | null;
  state: string | null;
  city: string | null;
  zip: string | null;
  units: number;
  occPct: number | null;
  active: boolean | null;
  lat: number | null;
  lng: number | null;
}

export interface UnitOut {
  id: number;
  propertyName: string;
  unitLabel: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  status: string | null;
  marketRent: number | null;
}

export interface LeaseOut {
  id: number;
  propertyName: string;
  unitLabel: string;
  tenants: string[];
  status: string;
  start: string | null;
  end: string | null;
  rent: number | null; // in dollars
}

export interface TenantOut {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  propertyName: string | null;
  unitLabel: string | null;
  type: string;
  balance: number | null;
}

export interface OwnerOut {
  id: number;
  company: string;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
}

// Utility function for ID normalization
export function normalizeId(v: any): string | null {
  return v === null || v === undefined ? null : String(v).trim();
}