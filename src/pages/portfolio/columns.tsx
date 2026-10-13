import React from "react";
import { money, shortDate } from "../../utils/format";
import ProgressBar from "@/components/cardkit/ProgressBar";
import StatusTag from "@/components/cardkit/StatusTag";
import { DataColumn } from "../../components/DataTable";

// PROPERTIES
export type PropertyRow = {
  id: string;
  name: string;
  type: string;
  class: string;
  state: string;
  city: string;
  zip: string;
  units: number;
  occPct: number;
  active: string | boolean; // keep as-is for tag
};

export function mapProperty(src:any): PropertyRow {
  return {
    id: String(src.id),
    name: src.name || "Unknown property",
    type: src.type || "Not specified",
    class: src.class || "Not specified",
    state: src.state || src.address_state || "Unknown",
    city:  src.city  || src.address_city  || "Unknown",
    zip:   src.zip   || src.address_zip   || "Unknown",
    units: Number.isFinite(Number(src.units)) ? Number(src.units) : 0,
    occPct: Number.isFinite(Number(src.occPct)) ? Number(src.occPct) : 0,
    active: !!src.active,
  };
}

export const PROPERTY_COLUMNS: DataColumn<PropertyRow>[] = [
  { key:"name",  header:"PROPERTY", type:"text", render:(value:any, r:PropertyRow)=><strong>{r.name}</strong> },
  { key:"type",  header:"TYPE", type:"text" },
  { key:"class", header:"CLASS", type:"text" },
  { key:"state", header:"STATE", type:"text" },
  { key:"city",  header:"CITY", type:"text" },
  { key:"zip",   header:"ZIP", type:"text" },
  { key:"units", header:"UNITS", align:"right", type:"number" },
  { key:"occPct", header:"OCCUPANCY", type:"number", render:(value:any, r:PropertyRow)=><ProgressBar value={r.occPct} /> },
  { key:"active", header:"ACTIVE", type:"enum", render:(value:any, r:PropertyRow)=><StatusTag status={String(r.active)} /> },
];

// UNITS
export type UnitRow = {
  id: string;
  property: string;
  unit: string;
  beds: number;
  baths: number;
  sqft: number;
  status: string;
  marketRent: number;
};

export function mapUnit(src:any): UnitRow {
  // Backend provides structured data - use it directly  
  return {
    id: String(src.id),
    property: src.propertyName || src.property?.name || "Unknown property",
    unit: src.unitLabel || src.unit_number || src.label || "Unknown unit",
    beds: Number.isFinite(Number(src.beds)) ? Number(src.beds) : 0,
    baths: Number.isFinite(Number(src.baths)) ? Number(src.baths) : 0, 
    sqft: Number.isFinite(Number(src.sqft || src.sq_ft)) ? Number(src.sqft || src.sq_ft) : 0,
    status: src.status || "Unknown",
    marketRent: Number.isFinite(Number(src.marketRent || src.rent_amount)) ? Number(src.marketRent || src.rent_amount) : 0,
  };
}

export const UNIT_COLUMNS: DataColumn<UnitRow>[] = [
  { key:"property", header:"PROPERTY", type:"text" },
  { key:"unit", header:"UNIT", type:"text" },
  { key:"beds", header:"BEDS", align:"right", type:"number" },
  { key:"baths", header:"BATHS", align:"right", type:"number" },
  { key:"sqft", header:"SQFT", align:"right", type:"number" },
  { key:"status", header:"STATUS", type:"enum", render:(value:any, r:UnitRow)=><StatusTag status={r.status} /> },
  { key:"marketRent", header:"MARKET RENT", align:"right", type:"number", render:(value:any, r:UnitRow)=>money(r.marketRent) },
];

// LEASES
export type LeaseRow = {
  id: string;
  property: string;
  unit: string;
  tenants: string;
  status: string;
  start: string;
  end: string;
  rent: number;
};

export function mapLease(src:any): LeaseRow {
  // Backend now provides clean, structured data
  const tenants = Array.isArray(src.tenants) ? src.tenants.join(", ") : "No tenants";
  
  return {
    id: String(src.id),
    property: src.propertyName || "Unknown property",
    unit: src.unitLabel || "Unknown unit", 
    tenants,
    status: src.status || "Unknown",
    start: src.start || "",
    end: src.end || "",
    rent: Number.isFinite(Number(src.rent)) ? Number(src.rent) : 0,
  };
}

export const LEASE_COLUMNS: DataColumn<LeaseRow>[] = [
  { key:"property", header:"PROPERTY", type:"text" },
  { key:"unit", header:"UNIT", type:"text" },
  { key:"tenants", header:"TENANT(S)", type:"text", render:(value:any, r:LeaseRow)=><strong>{r.tenants}</strong> },
  { key:"status", header:"STATUS", type:"enum", render:(value:any, r:LeaseRow)=><StatusTag status={r.status} /> },
  { key:"start", header:"START", type:"date", render:(value:any, r:LeaseRow)=>shortDate(r.start) },
  { key:"end", header:"END", type:"date", render:(value:any, r:LeaseRow)=>shortDate(r.end) },
  { key:"rent", header:"RENT", align:"right", type:"number", render:(value:any, r:LeaseRow)=>money(r.rent) },
];

// TENANTS
export type TenantRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  property: string;
  unit: string;
  type: string; // primary | secondary | prospect
  balance: number;
};

export function mapTenant(src:any): TenantRow {
  // Backend provides structured data - use it directly
  return {
    id: String(src.id),
    name: src.name || "Unknown tenant",
    email: src.email || "Not provided", 
    phone: src.phone || "Not provided",
    property: src.propertyName || src.property?.name || "Unknown property",
    unit: src.unitLabel || src.unit?.label || "Unknown unit",
    type: src.type || "PROSPECT_TENANT",
    balance: Number.isFinite(Number(src.balance)) ? Number(src.balance) : 0,
  };
}

export const TENANT_COLUMNS: DataColumn<TenantRow>[] = [
  { key:"name", header:"TENANT", type:"text" },
  { key:"email", header:"EMAIL", type:"text" },
  { key:"phone", header:"PHONE", type:"text" },
  { key:"property", header:"PROPERTY", type:"text" },
  { key:"unit", header:"UNIT", type:"text" },
  { key:"type", header:"TYPE", type:"enum", render:(value:any, r:TenantRow)=><StatusTag status={r.type} /> },
  { key:"balance", header:"BALANCE", align:"right", type:"number", render:(value:any, r:TenantRow)=>money(r.balance) },
];

// OWNERS
export type OwnerRow = {
  id: string;
  company: string;
  name: string;
  email: string;
  phone: string;
  active: string | boolean;
};

export function mapOwner(src:any): OwnerRow {
  // Backend provides structured data - use it directly
  return {
    id: String(src.id),
    company: src.company || src.company_name || "Not provided",
    name: src.name || src.display_name || src.full_name || "Unknown owner",
    email: src.email || src.primary_email || src.contact_email || "Not provided",
    phone: src.phone || src.phone_number || src.primary_phone || "Not provided", 
    active: src.active,
  };
}

export const OWNER_COLUMNS: DataColumn<OwnerRow>[] = [
  { key:"company", header:"COMPANY", type:"text", render:(_v: any, r: OwnerRow) => <strong>{r.company}</strong> },
  { key:"name", header:"OWNER", type:"text" },
  { key:"email", header:"EMAIL", type:"text" },
  { key:"phone", header:"PHONE", type:"text" },
  { key:"active", header:"ACTIVE", type:"enum", render:(value:any, r:OwnerRow)=><StatusTag status={String(r.active)} /> },
];