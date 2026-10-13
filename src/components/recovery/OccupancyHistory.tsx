import React from "react";
import { Sparkline } from "@/features/dashboard/components/Sparkline";
import "./recovery-ui.css";

type Point = { date: string; occupancy: number };

/** Already-validated portfolio summary observations; no new fetch or derived forecast. */
export default function OccupancyHistory({ series }: { series: readonly Point[] }) {
  return (
    <section className="recovery-history" aria-labelledby="occupancy-history-heading">
      <h2 id="occupancy-history-heading">Reported occupancy history</h2>
      <Sparkline data={series.map((p) => ({ date: p.date, value: p.occupancy * 100 }))} />
      {series.length > 0 ? (
        <details className="recovery-history-details">
          <summary>View reported observations</summary>
          <div className="recovery-history-scroll" tabIndex={0} role="region" aria-label="Occupancy observations">
            <table>
              <caption>Dates and occupancy supplied by the portfolio summary</caption>
              <thead><tr><th scope="col">Reported date</th><th scope="col">Occupancy</th></tr></thead>
              <tbody>{series.map((p, index) => (
                <tr key={`${p.date}-${index}`}><td>{p.date}</td><td>{(p.occupancy * 100).toFixed(1)}%</td></tr>
              ))}</tbody>
            </table>
          </div>
        </details>
      ) : null}
    </section>
  );
}
