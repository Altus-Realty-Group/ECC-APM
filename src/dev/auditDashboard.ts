// Dev auditor for Dashboard debug mode - Genesis specification
// Accessible at /dashboard?debug=1

export interface AuditData {
  propertiesWithCoords: {
    total: number;
    withCoords: number;
    percentage: number;
  };
  statusCounts: Record<string, number>;
  expiringLeases: {
    count: number;
    sample: Array<{
      tenantName: string;
      property: string;
      endDate: string;
    }>;
  };
  delinquentTenants: {
    count: number;
    sample: Array<{
      name: string;
      property: string;
      balance: number;
    }>;
  };
  highPriorityWO: {
    count: number;
    unassigned: number;
    sample: Array<{
      property: string;
      summary: string;
      assignedVendor?: string;
    }>;
  };
  seriesData: {
    monthsCount: number;
    dateRange: string;
  };
}

export function runDashboardAudit(dashboardData: any): AuditData {
  try {
    const { properties, tenants, leases, workOrders, series } = dashboardData;

    // Properties with coordinates analysis
    const propertiesWithCoords = {
      total: properties?.length || 0,
      withCoords: properties?.filter((p: any) => 
        p.lat && p.lng && !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== 0 && p.lng !== 0
      ).length || 0,
      percentage: 0,
    };
    
    if (propertiesWithCoords.total > 0) {
      propertiesWithCoords.percentage = 
        (propertiesWithCoords.withCoords / propertiesWithCoords.total) * 100;
    }

    // Status counts
    const statusCounts: Record<string, number> = {};
    properties?.forEach((p: any) => {
      const status = p.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Leases expiring <= 45 days
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 45);
    
    const expiringLeases = leases?.filter((l: any) => {
      if (!l.endDate) return false;
      const endDate = new Date(l.endDate);
      return l.status === 'active' && endDate >= now && endDate <= futureDate;
    }) || [];

    // Delinquent tenants
    const delinquentTenants = tenants?.filter((t: any) => 
      t.isDelinquent && t.balance > 0
    ).sort((a: any, b: any) => b.balance - a.balance) || [];

    // High-priority work orders
    const highPriorityWO = workOrders?.filter((w: any) => 
      w.priority === 'high'
    ) || [];
    
    const unassignedHighPriority = highPriorityWO.filter((w: any) => 
      !w.assignedVendor
    ).length;

    // Series data analysis
    const seriesData = {
      monthsCount: series?.months?.length || 0,
      dateRange: series?.months?.length > 0 ? 
        `${series.months[0]?.month} - ${series.months[series.months.length - 1]?.month}` : 
        'No data',
    };

    const auditResult: AuditData = {
      propertiesWithCoords,
      statusCounts,
      expiringLeases: {
        count: expiringLeases.length,
        sample: expiringLeases.slice(0, 5).map((l: any) => ({
          tenantName: l.tenantName || 'Unknown',
          property: l.unitLabel || 'Unknown Unit',
          endDate: l.endDate,
        })),
      },
      delinquentTenants: {
        count: delinquentTenants.length,
        sample: delinquentTenants.slice(0, 5).map((t: any) => ({
          name: t.name,
          property: t.propertyName || 'Unknown Property',
          balance: t.balance,
        })),
      },
      highPriorityWO: {
        count: highPriorityWO.length,
        unassigned: unassignedHighPriority,
        sample: highPriorityWO.slice(0, 5).map((w: any) => ({
          property: w.propertyName || 'Unknown Property',
          summary: w.summary || 'No summary',
          assignedVendor: w.assignedVendor,
        })),
      },
      seriesData,
    };

    // Console output for debug mode
    console.group('🔍 Dashboard Data Audit');
    
    console.log('Properties with Coordinates');
    console.table([
      { Metric: 'Total Properties', Value: propertiesWithCoords.total },
      { Metric: 'With Valid Coords', Value: propertiesWithCoords.withCoords },
      { Metric: 'Percentage', Value: `${propertiesWithCoords.percentage.toFixed(1)}%` },
    ]);

    if (Object.keys(statusCounts).length > 0) {
      console.log('Property Status Counts');
      console.table(Object.entries(statusCounts).map(([status, count]) => ({
          Status: status,
          Count: count,
        }))
      );
    }

    if (auditResult.expiringLeases.sample.length > 0) {
      console.log('Leases Expiring ≤45 Days (Sample)');
      console.table(auditResult.expiringLeases.sample);
    }

    if (auditResult.delinquentTenants.sample.length > 0) {
      console.log('Top Delinquent Tenants (Sample)');
      console.table(auditResult.delinquentTenants.sample);
    }

    if (auditResult.highPriorityWO.sample.length > 0) {
      console.log('High-Priority Work Orders (Sample)');
      console.table(auditResult.highPriorityWO.sample);
    }

    console.log('Series Data Coverage');
    console.table([
      { Metric: 'Months Count', Value: seriesData.monthsCount },
      { Metric: 'Date Range', Value: seriesData.dateRange },
    ]);

    console.groupEnd();

    return auditResult;
  } catch (error) {
    console.warn('Dashboard audit failed:', error);
    
    // Return safe defaults on error
    return {
      propertiesWithCoords: { total: 0, withCoords: 0, percentage: 0 },
      statusCounts: {},
      expiringLeases: { count: 0, sample: [] },
      delinquentTenants: { count: 0, sample: [] },
      highPriorityWO: { count: 0, unassigned: 0, sample: [] },
      seriesData: { monthsCount: 0, dateRange: 'No data' },
    };
  }
}