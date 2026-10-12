import React from "react";

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function googleMapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function Section({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="ecc-object" style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

export default function GeoMap({
  title = "Map & Location",
  address,
  lat,
  lng,
}: {
  title?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
}) {
  const hasCoords = isFiniteNumber(lat) && isFiniteNumber(lng);
  const hasAddress = !!address && address !== "—";

  let src: string | null = null;
  if (hasCoords) {
    // Simple OSM embed when coords available
    const pad = 0.005;
    const bbox = [lng! - pad, lat! - pad, lng! + pad, lat! + pad].join(",");
    src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  } else if (hasAddress) {
    src = `https://www.google.com/maps?q=${encodeURIComponent(address!)}&output=embed`;
  }

  return (
    <Section title={title} actions={hasAddress ? <a href={googleMapsHref(address!)} target="_blank" rel="noreferrer">Open in Maps</a> : null}>
      {src ? (
        <div style={{ borderRadius: 12, overflow: "hidden" }}>
          <iframe
            title="map"
            src={src}
            style={{ width: "100%", height: 260, border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : (
        <div style={{ opacity: 0.8 }}>No coordinates or address available.</div>
      )}
    </Section>
  );
}