// LeasingFunnel.tsx - Genesis specification horizontal funnel with live data
import React from 'react';
import { BarChart, Bar, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer } from './ChartContainer';
import { ActionButton } from './ActionButton';

interface LeasingFunnelProps {
  funnel: {
    applications: number;
    screenings: number;
    signed: number;
  };
}

export function LeasingFunnel({ funnel }: LeasingFunnelProps) {
  // Horizontal funnel data
  const funnelSteps = [
    {
      name: 'Applications',
      value: funnel.applications,
      color: 'var(--chart-blue)',
      route: '/leasing/applications',
    },
    {
      name: 'Screenings',
      value: funnel.screenings,
      color: 'var(--altus-gold)',
      route: '/leasing/screenings',
    },
    {
      name: 'Leases Signed',
      value: funnel.signed,
      color: 'var(--chart-green)',
      route: '/leasing/signed',
    },
  ];

  // Calculate conversion rates
  const conversionRates = {
    applicationToScreening: funnel.applications > 0 ? (funnel.screenings / funnel.applications) * 100 : 0,
    screeningToSigned: funnel.screenings > 0 ? (funnel.signed / funnel.screenings) * 100 : 0,
    overallConversion: funnel.applications > 0 ? (funnel.signed / funnel.applications) * 100 : 0,
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[var(--panel-bg)] border border-[var(--line)] rounded-lg p-3 shadow-lg">
          <p className="text-[var(--text)] font-medium">{data.name}</p>
          <p className="text-[var(--text-dim)] text-sm">{data.value} total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="ecc-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="ecc-panel__title text-lg">Leasing Funnel (Last 90 Days)</h3>
      </div>

      <div className="space-y-6">
        {/* Horizontal Funnel Steps */}
        <div className="space-y-4">
          {funnelSteps.map((step, index) => {
            const isFirst = index === 0;
            const maxValue = funnel.applications;
            const widthPercentage = maxValue > 0 ? (step.value / maxValue) * 100 : 0;

            return (
              <div key={step.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: step.color }}
                    />
                    <span className="small-label">{step.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="number-sm">{step.value}</span>
                    <ActionButton
                      size="small"
                      onClick={() => window.open(step.route, '_blank')}
                    >
                      View
                    </ActionButton>
                  </div>
                </div>

                {/* Horizontal Bar */}
                <div className="relative">
                  <div className="w-full h-6 bg-[var(--line)] rounded-lg overflow-hidden">
                    <div 
                      className="h-full rounded-lg transition-all duration-300"
                      style={{ 
                        width: `${widthPercentage}%`, 
                        backgroundColor: step.color 
                      }}
                    />
                  </div>
                  
                  {/* Conversion Rate Arrow (except for first step) */}
                  {!isFirst && (
                    <div className="absolute -bottom-6 left-4 text-xs text-[var(--text-dim)]">
                      {index === 1 
                        ? `${conversionRates.applicationToScreening.toFixed(1)}% convert`
                        : `${conversionRates.screeningToSigned.toFixed(1)}% convert`
                      }
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--line)]">
          <div className="text-center">
            <div className="number-lg text-[var(--chart-blue)]">
              {conversionRates.applicationToScreening.toFixed(1)}%
            </div>
            <div className="small-label">App → Screen</div>
          </div>
          <div className="text-center">
            <div className="number-lg text-[var(--altus-gold)]">
              {conversionRates.screeningToSigned.toFixed(1)}%
            </div>
            <div className="small-label">Screen → Sign</div>
          </div>
          <div className="text-center">
            <div className="number-lg text-[var(--chart-green)]">
              {conversionRates.overallConversion.toFixed(1)}%
            </div>
            <div className="small-label">Overall</div>
          </div>
        </div>
      </div>
    </div>
  );
}