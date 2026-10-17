import React, { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useAllUnits } from '@/lib/ecc-resolvers';
import { useSessionEpoch } from '@/lib/sessionScope';
import { errorKind } from '@/lib/dataState';
import StateNotice from '@/components/ui/StateNotice';
import { filterUnitRows, mapUnitRows, reportedOptions, type UnitReviewRow } from './unitWorkflow';
import './units-workflow.css';

type UnitsQuery = Pick<
  ReturnType<typeof useAllUnits>,
  'data' | 'isLoading' | 'isFetching' | 'isSuccess' | 'isError' | 'error' | 'refetch'
>;
const money = (v: number | null) =>
  v === null
    ? 'Not reported'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const number = (v: number | null) => (v === null ? 'Not reported' : v.toLocaleString('en-US'));
type ReviewStage = 'review' | 'follow-up';
function UnitReadyView({ data, refresh }: { data: unknown[]; refresh: () => void }) {
  const rows = useMemo(() => mapUnitRows(data), [data]);
  const [search, setSearch] = useState('');
  const [property, setProperty] = useState('');
  const [status, setStatus] = useState('');
  // Selection belongs to the exact loaded source, never a replacement with reused IDs.
  const [review, setReview] = useState<{ source: unknown[]; stages: Record<string, ReviewStage> }>({
    source: data,
    stages: {},
  });
  const stages = review.source === data ? review.stages : {};
  const visible = filterUnitRows(rows, { search, property, status });
  const selected = rows.filter((row) => stages[row.key]);
  const updateStage = (key: string, stage?: ReviewStage) =>
    setReview((current) => {
      const next = { ...(current.source === data ? current.stages : {}) };
      if (stage) next[key] = stage;
      else delete next[key];
      return { source: data, stages: next };
    });
  const clearReview = () => setReview({ source: data, stages: {} });
  const clearFilters = () => {
    setSearch('');
    setProperty('');
    setStatus('');
    clearReview();
  };
  const title = (row: UnitReviewRow) =>
    row.href ? (
      <Link href={row.href}>{row.unit ?? 'Unit label not reported'}</Link>
    ) : (
      <span>{row.unit ?? 'Unit label not reported'}</span>
    );
  return (
    <>
      <div className="ecc-units-scope">
        <strong>
          {rows.length} loaded unit{rows.length === 1 ? '' : 's'}
        </strong>
        <span>
          These are loaded records, not confirmed portfolio totals. Missing values stay unreported.
        </span>
        <button
          type="button"
          onClick={() => {
            clearReview();
            refresh();
          }}
        >
          Refresh units
        </button>
      </div>
      <div className="ecc-units-filters">
        <label>
          Search units
          <input
            value={search}
            placeholder="Unit, property, status or ID"
            onChange={(e) => {
              setSearch(e.target.value);
              clearReview();
            }}
          />
        </label>
        <label>
          Property
          <select
            aria-label="Filter units by property"
            value={property}
            onChange={(e) => {
              setProperty(e.target.value);
              clearReview();
            }}
          >
            <option value="">All reported properties</option>
            {reportedOptions(rows, 'property').map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            aria-label="Filter units by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              clearReview();
            }}
          >
            <option value="">All reported statuses</option>
            {reportedOptions(rows, 'status').map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={clearFilters}>
          Clear filters
        </button>
      </div>
      <p className="ecc-units-result" role="status">
        {visible.length} of {rows.length} loaded units shown
      </p>
      {rows.length === 0 ? (
        <StateNotice
          kind="empty"
          title="No units were returned."
          detail="This completed read returned no unit records."
        />
      ) : visible.length === 0 ? (
        <StateNotice
          kind="empty"
          title="No units match these filters."
          detail="Clear filters to return to all loaded units."
        />
      ) : null}
      <div className="ecc-units-grid">
        {visible.map((row) => (
          <article
            className="ecc-unit-record"
            key={row.key}
            aria-label={`Unit ${row.unit ?? row.id ?? 'not reported'}`}
          >
            <div className="ecc-unit-record-heading">
              <h2>{title(row)}</h2>
              <span>{row.status ?? 'Status not reported'}</span>
            </div>
            <p className="ecc-unit-property">{row.property ?? 'Property not reported'}</p>
            <dl>
              <div>
                <dt>Unit ID</dt>
                <dd>{row.id ?? 'Not reported'}</dd>
              </div>
              <div>
                <dt>Beds</dt>
                <dd>{number(row.beds)}</dd>
              </div>
              <div>
                <dt>Baths</dt>
                <dd>{number(row.baths)}</dd>
              </div>
              <div>
                <dt>Square feet</dt>
                <dd>{number(row.sqft)}</dd>
              </div>
              <div>
                <dt>Reported market rent</dt>
                <dd>{money(row.marketRent)}</dd>
              </div>
            </dl>
            <label className="ecc-unit-select">
              <input
                type="checkbox"
                checked={!!stages[row.key]}
                onChange={(e) => updateStage(row.key, e.target.checked ? 'review' : undefined)}
              />
              Review {row.unit ?? row.id ?? 'this unit'}
            </label>
            {!row.href ? (
              <p className="ecc-unit-missing-link">A valid unit ID is needed to open its card.</p>
            ) : null}
          </article>
        ))}
      </div>
      <section className="ecc-units-review" aria-labelledby="unit-review-title">
        <div className="ecc-units-review-heading">
          <div>
            <h2 id="unit-review-title">Unit review</h2>
            <p>
              Organize selected units for this visit. Review labels are not saved or sent as work
              orders.
            </p>
          </div>
          <button type="button" disabled={!selected.length} onClick={clearReview}>
            Clear review
          </button>
        </div>
        {!selected.length ? (
          <p>Select a unit above to review it here.</p>
        ) : (
          <ul>
            {selected.map((row) => (
              <li key={row.key}>
                <div>
                  <strong>{row.unit ?? 'Unit label not reported'}</strong>
                  <span>{row.property ?? 'Property not reported'}</span>
                </div>
                <label>
                  Review stage for {row.unit ?? row.id ?? 'this unit'}
                  <select
                    aria-label={`Review stage for ${row.unit ?? row.id ?? 'this unit'}`}
                    value={stages[row.key]}
                    onChange={(e) => updateStage(row.key, e.target.value as ReviewStage)}
                  >
                    <option value="review">Review</option>
                    <option value="follow-up">Follow up</option>
                  </select>
                </label>
                <button type="button" onClick={() => updateStage(row.key)}>
                  Remove {row.unit ?? row.id ?? 'unit'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
export function UnitSurface({ query }: { query: UnitsQuery }) {
  const epoch = useSessionEpoch();
  const denied = query.isError && errorKind(query.error) === 'denied';
  const malformed =
    query.isSuccess &&
    (!Array.isArray(query.data) ||
      query.data.some((row) => !row || typeof row !== 'object' || Array.isArray(row)));
  const ready =
    query.isSuccess &&
    !query.isError &&
    !query.error &&
    !query.isFetching &&
    !query.isLoading &&
    !malformed &&
    Array.isArray(query.data);
  const failed = query.isError || !!query.error || malformed;
  return (
    <section className="ecc-units-page" aria-labelledby="units-title">
      <header className="ecc-units-heading">
        <div>
          <p className="ecc-units-eyebrow">Portfolio review</p>
          <h1 id="units-title">Units</h1>
          <p>Find a unit, inspect its reported details and open its record.</p>
        </div>
        <Link href="/portfolio/properties">Review properties</Link>
      </header>
      {ready ? (
        <UnitReadyView
          key={epoch}
          data={query.data!}
          refresh={() => {
            void query.refetch();
          }}
        />
      ) : (
        <StateNotice
          kind={
            denied
              ? 'denied'
              : failed
                ? 'error'
                : query.isLoading || query.isFetching
                  ? 'loading'
                  : 'partial'
          }
          title={
            denied
              ? "You don't have access to units."
              : failed
                ? 'Units could not be loaded.'
                : query.isLoading || query.isFetching
                  ? 'Loading units...'
                  : 'Units have not been confirmed.'
          }
          detail="Counts, records and selection review are unavailable until a read succeeds."
          onRetry={
            query.isLoading || query.isFetching
              ? undefined
              : () => {
                  void query.refetch();
                }
          }
        />
      )}
    </section>
  );
}
export default function Units() {
  return <UnitSurface query={useAllUnits()} />;
}
