import React, { useEffect, useState } from "react";
import { DENSITY_KEY, readDensity, type Density } from "./workspacePreferences";

export function useWorkspaceDensity() {
  const [density, setDensity] = useState(readDensity);
  useEffect(() => {
    const update = () => setDensity(readDensity());
    window.addEventListener("storage", update); window.addEventListener("ecc:preferences", update);
    return () => { window.removeEventListener("storage", update); window.removeEventListener("ecc:preferences", update); };
  }, []);
  return density;
}

export default function WorkspacePreferences() {
  const density = useWorkspaceDensity();
  const [error, setError] = useState(false);
  function save(next: Density) {
    try { localStorage.setItem(DENSITY_KEY, next); setError(false); window.dispatchEvent(new Event("ecc:preferences")); }
    catch { setError(true); }
  }
  return <section className="ecc-preferences" aria-labelledby="workspace-preferences-title">
    <header className="ecc-collection-heading"><h1 id="workspace-preferences-title">Workspace preferences</h1><p>Adjust how records appear in this browser. These settings do not change portfolio records or account permissions.</p></header>
    <fieldset><legend>Table spacing</legend><p>Choose more reading space or fit more records on screen.</p>
      {(["comfortable", "compact"] as const).map(option => <label key={option}><input type="radio" name="workspace-density" value={option} checked={density === option} onChange={() => save(option)} /><span><strong>{option === "comfortable" ? "Comfortable" : "Compact"}</strong><small>{option === "comfortable" ? "More space between records." : "Closer rows; controls keep their touch targets."}</small></span></label>)}
    </fieldset>
    <p role="status">Current spacing: {density}. Saved in this browser when storage is available.</p>
    {error ? <p role="alert">Your browser could not save this preference. Allow browser storage and try again.</p> : null}
    <button type="button" className="ecc-btn" disabled={density === "comfortable"} onClick={() => save("comfortable")}>Restore default spacing</button>
  </section>;
}
