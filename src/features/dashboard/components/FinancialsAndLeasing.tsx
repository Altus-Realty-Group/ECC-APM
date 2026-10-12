// Genesis Grade Financials & Leasing - Cash Flow and Funnel Analytics

import React, { useState } from 'react';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  TooltipContentProps
} from 'recharts';
import { ChartContainer } from './ChartContainer';
import { ActionButton } from './ActionButton';
import type { CashFlowData, LeasingFunnelData } from '../hooks/useDashboardData';

interface FinancialsAndLeasingProps {
  cashflow90: CashFlowData[];
  leasingFunnel30: LeasingFunnelData;
}

// Custom Tooltip for Cash Flow Chart
function CashFlowTooltip({ active, payload, label }: TooltipContentProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
  
  const income = payload.find(p => p.dataKey === 'income')?.value || 0;
  const expenses = payload.find(p => p.dataKey === 'expenses')?.value || 0;
  const noi = payload.find(p => p.dataKey === 'noi')?.value || 0;
  
  return (
    <div className="bg-[var(--panel-bg)] border border-[var(--line)] rounded-lg p-4 shadow-xl">
      <div className="text-sm font-semibold text-[var(--text)] mb-3">{label}</div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[var(--good)] rounded"></div>
            <span className="text-[var(--text-dim)]">Income</span>
          </div>
          <span className="font-medium text-[var(--text)]">
            ${Number(income).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[var(--neutral)] rounded"></div>
            <span className="text-[var(--text-dim)]">Expenses</span>
          </div>
          <span className="font-medium text-[var(--text)]">
            ${Number(expenses).toLocaleString()}
          </span>
        </div>
        <div className="border-t border-[var(--line)] pt-2 mt-2">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 bg-[var(--altus-gold)] rounded"></div>
              <span className="text-[var(--text)]">NOI</span>
            </div>
            <span className="font-bold text-[var(--altus-gold)]">
              ${Number(noi).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Range Toggle Component
function RangeToggle({ 
  options, 
  selected, 
  onChange 
}: { 
  options: Array<{ value: string; label: string }>; 
  selected: string; 
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-[var(--panel-elev)] rounded-lg p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1 text-xs font-medium rounded transition-all ${
            selected === option.value
              ? 'bg-[var(--altus-gold)] text-[var(--altus-black)]'
              : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--line)]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Leasing Funnel Visualization
function LeasingFunnel({ funnel }: { funnel: LeasingFunnelData }) {
  const stages = [
    { key: 'leads', label: 'Leads', value: funnel.leads, color: 'var(--info)' },
    { key: 'tours', label: 'Tours', value: funnel.tours, color: 'var(--altus-gold)' },
    { key: 'applications', label: 'Applications', value: funnel.applications, color: 'var(--warn)' },
    { key: 'approved', label: 'Approved', value: funnel.approved, color: 'var(--good)' },
    { key: 'signed', label: 'Signed', value: funnel.signed, color: 'var(--altus-gold)' }
  ];
  
  const maxValue = Math.max(...stages.map(s => s.value)) || 1;
  
  return (
    <div className="space-y-4">
      {stages.map((stage, index) => {
        const percentage = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
        const conversionRate = index > 0 && stages[index - 1].value > 0 ? 
          (stage.value / stages[index - 1].value) * 100 : 
          100;
        
        return (
          <div key={stage.key} className="flex items-center gap-4">
            <div className="w-24 text-sm text-[var(--text-dim)] text-right font-medium">
              {stage.label}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-semibold text-[var(--text)]">
                  {stage.value}
                </div>
                {index > 0 && (
                  <div className="text-xs text-[var(--text-dim)]">
                    {conversionRate.toFixed(1)}% conversion
                  </div>
                )}
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-bar__fill transition-all duration-500"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: stage.color
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FinancialsAndLeasing({ cashflow90, leasingFunnel30 }: FinancialsAndLeasingProps) {
  const [selectedRange, setSelectedRange] = useState('90');
  
  const rangeOptions = [
    { value: '30', label: '30d' },
    { value: '60', label: '60d' },
    { value: '90', label: '90d' }
  ];

  return (
    <div className="financial-grid" data-testid="financials-and-leasing">
      {/* Cash Flow Chart */}
      <ChartContainer
        title="90-Day Cash Flow"
        subtitle="Weekly income, expenses, and net operating income"
        actions={
          <ActionButton variant="secondary" size="small" href="/accounting?range=90d">
            View Details →
          </ActionButton>
        }
      >
        <div className="h-[280px] mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={cashflow90} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="var(--line)"
                opacity={0.3}
              />
              <XAxis 
                dataKey="periodLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'var(--text-dim)' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'var(--text-dim)' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip content={CashFlowTooltip} />
              
              <Bar 
                dataKey="income"
                fill="var(--good)"
                opacity={0.8}
                radius={[2, 2, 0, 0]}
                name="Income"
              />
              
              <Bar 
                dataKey="expenses"
                fill="var(--neutral)"
                opacity={0.8}
                radius={[2, 2, 0, 0]}
                name="Expenses"
              />
              
              <Line 
                type="monotone"
                dataKey="noi"
                stroke="var(--altus-gold)"
                strokeWidth={3}
                dot={{ fill: 'var(--altus-gold)', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: 'var(--altus-gold)', strokeWidth: 2 }}
                name="NOI"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Chart Legend */}
        <div className="flex items-center justify-center gap-6 text-xs border-t border-[var(--line)] pt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[var(--good)] rounded"></div>
            <span className="text-[var(--text-dim)]">Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[var(--neutral)] rounded"></div>
            <span className="text-[var(--text-dim)]">Expenses</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-[var(--altus-gold)] rounded"></div>
            <span className="text-[var(--text-dim)]">Net Operating Income</span>
          </div>
        </div>
      </ChartContainer>

      {/* Leasing Funnel */}
      <ChartContainer
        title="Leasing Funnel"
        subtitle="Lead conversion and pipeline performance"
        actions={
          <RangeToggle
            options={rangeOptions}
            selected={selectedRange}
            onChange={setSelectedRange}
          />
        }
      >
        <div className="mb-6">
          <LeasingFunnel funnel={leasingFunnel30} />
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-[var(--line)]">
          <ActionButton 
            variant="primary" 
            className="flex-1"
            href="/portfolio/units?status=vacant"
          >
            View Vacants
          </ActionButton>
          <ActionButton 
            variant="secondary" 
            className="flex-1"
            href="/leases?status=pending"
          >
            Applications
          </ActionButton>
        </div>
      </ChartContainer>
    </div>
  );
}