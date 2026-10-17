// Compatibility readers use the same governed summary as the mounted dashboard.
// Unsupported detail metrics remain unknown until their authoritative readers exist.
import { useDashboardKpis } from "./useDashboardKpis";
import type { DashboardKpis } from "../kpiAdapter";

export interface DashboardKPIs {
  occupancyPct: number;
  rentReadyVacant: {
    ready: number;
    vacant: number;
  };
  collectionsRatePct: number;
  openCriticalWO: number;
}

export interface MapProperty {
  id: string;
  lat: number;
  lng: number;
  address: string;
  city: string;
  status: 'occupied' | 'vacant' | 'delinquent' | 'rent-ready';
  currentTenant?: string;
  rentReady?: boolean;
}

export interface ActionFeedItem {
  id: string;
  type: 'delinquent' | 'lease-expiring' | 'maintenance';
  priority: 'critical' | 'high' | 'medium';
  title: string;
  subtitle: string;
  meta: string;
  actions: Array<{
    label: string;
    href: string;
    variant: 'primary' | 'secondary' | 'danger';
  }>;
}

export interface CashFlowData {
  periodLabel: string;
  income: number;
  expenses: number;
  noi: number;
}

export interface LeasingFunnelData {
  leads: number;
  tours: number;
  applications: number;
  approved: number;
  signed: number;
}

export interface OccupancyByCityData {
  city: string;
  properties: number;
  occupiedUnits: number;
  totalUnits: number;
  occupancy: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  propertiesForMap: MapProperty[];
  actionFeed: ActionFeedItem[];
  cashflow90: CashFlowData[];
  leasingFunnel30: LeasingFunnelData;
  occupancy30: {
    byCity: OccupancyByCityData[];
  };
}

export interface KpiData {
  occupancy: number | null;
  rentReady: { ready: number | null; vacant: number | null };
  collections: number | null;
  criticalWOs: number | null;
}

export interface MapDataProperty {
  id: string;
  lat: number;
  lng: number;
  status: 'occupied-current' | 'vacant-ready' | 'vacant-down' | 'delinquent';
  address?: string;
}

export interface FeedItem {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
}

export interface FeedData {
  delinquencyAlerts: FeedItem[];
  leaseRenewals: FeedItem[];
  maintenanceHotlist: FeedItem[];
}

export function summaryMetrics(summary: DashboardKpis | null | undefined): KpiData {
  return {
    occupancy: summary?.occupancyRate == null ? null : summary.occupancyRate * 100,
    rentReady: { ready: null, vacant: null },
    collections: null,
    criticalWOs: null,
  };
}

export function useDashboardData() {
  const query = useDashboardKpis();
  // Never promote retained data after a failed request to a current summary.
  const data = query.isError ? null : query.data ?? null;
  const metrics = summaryMetrics(data);
  const occupancyChartData = metrics.occupancy === null ? [] : [
    { name: "Occupied", value: metrics.occupancy, color: "var(--good)" },
    { name: "Vacant", value: 100 - metrics.occupancy, color: "var(--neutral)" },
  ];
  return {
    data,
    loading: query.isLoading,
    isLoading: query.isLoading,
    error: query.error,
    kpiData: metrics,
    occupancyChartData,
    // The summary feed has no cash-flow, collections history, task or location series.
    // Empty arrays here mean unavailable capability, never a verified empty result.
    collectionsSparklineData: [] as Array<{ name: string; value: number }>,
    mapData: [] as MapDataProperty[],
    mapAvailable: false,
    feedData: { delinquencyAlerts: [], leaseRenewals: [], maintenanceHotlist: [] } as FeedData,
    feedAvailable: false,
  };
}
