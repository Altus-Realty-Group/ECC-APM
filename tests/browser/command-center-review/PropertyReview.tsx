import React, { useState } from 'react';
import type { ReviewProperty } from './model';

type Mode = 'Conversation' | 'Work' | 'History';
type Props = {
  property: ReviewProperty;
  drafts: Readonly<Record<string, string>>;
  onDraft: (purpose: string, value: string) => void;
  onReturn: () => void;
};

/** Shared review presentation only; no API, upload, operating write or persistence. */
export function PropertyReview({ property, drafts, onDraft, onReturn }: Props) {
  const [tab, setTab] = useState('Overview');
  const [dock, setDock] = useState<Mode>('Work');
  const [purpose, setPurpose] = useState('Maintenance / access');
  const draft = drafts[purpose] ?? '';
  const [preview, setPreview] = useState(false);
  const [issue, setIssue] = useState('');
  const [note, setNote] = useState('');
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [locationView, setLocationView] = useState<'Map' | 'Address'>('Map');
  const [space, setSpace] = useState<number | null>(null);
  const units = Array.from({ length: property.units }, (_, index) => ({
    number: index + 1, occupied: index < property.occupied,
  }));
  const switchDock = (mode: Mode) => { setDock(mode); setPreview(false); };

  return <section className="rv-command rv-property-workspace">
    <header className="rv-record-heading">
      <div><button className="rv-return" onClick={onReturn}>← Return to portfolio review</button>
        <h1>{property.name}</h1><p>{property.city} · Synthetic residential property · {property.units} units</p></div>
      <button className="rv-button rv-primary-action" onClick={() => switchDock('Work')}>Review property work</button>
    </header>
    <div className="rv-record-actions" aria-label="Property actions">
      <button className="rv-button" onClick={() => switchDock('Conversation')}>Message…</button>
      <button className="rv-button" onClick={() => switchDock('Work')}>New service request</button>
      <button className="rv-button" onClick={() => switchDock('History')}>Add servicing note</button>
      <button className="rv-button" onClick={() => setTab('Files')}>Attach file</button>
      <span>Selected scope: {space ? `Unit ${space}` : 'property'}</span>
    </div>
    <nav className="rv-record-tabs" aria-label="Property record sections">
      {['Overview', 'Financials', 'Legal', 'Files'].map(value => <button key={value}
        aria-pressed={tab === value} onClick={() => setTab(value)}>{value}</button>)}
    </nav>
    <div className="rv-property-columns">
      <div className="rv-property-main">
        {tab === 'Overview' ? <>
          <section className="rv-panel"><header className="rv-panel-head"><div><small>PROPERTY CONTEXT</small><h2>Location & access</h2></div>
            <div className="rv-range">{(['Map', 'Address'] as const).map(value => <button key={value}
              aria-pressed={locationView === value} onClick={() => setLocationView(value)}>{value}</button>)}</div></header>
            {locationView === 'Map' ? <div className="rv-location-map"><svg viewBox="0 0 700 270" role="img" aria-label="Schematic property map; fictional location, not verified coordinates">
              <rect width="700" height="270" fill="#151916" />
              {[20, 120, 220, 410, 510, 610].map(x => <g key={x}><rect x={x} y="15" width="68" height="65" fill="#242a22" stroke="#42483c" /><rect x={x + 13} y="27" width="40" height="37" fill="#343c30" /><rect x={x} y="200" width="68" height="55" fill="#242a22" stroke="#42483c" /></g>)}
              <path d="M0 130H700M340 0V270" stroke="#535b4b" strokeWidth="30" /><path d="M0 130H700M340 0V270" stroke="#1c211b" strokeWidth="20" />
              <rect x="408" y="197" width="73" height="59" fill="#51482b" stroke="#d4af37" strokeWidth="3" />
              <circle cx="445" cy="190" r="16" fill="#d4af37" /><text x="445" y="195" textAnchor="middle" fill="#111" fontSize="15">1</text>
              <text x="30" y="115" fill="#d6d9ce" fontSize="14">ILLUSTRATIVE STREET</text><text x="655" y="38" fill="#d4af37" fontSize="18">N ↑</text>
            </svg><p>Schematic review map · no provider request or verified geocode</p></div>
              : <div className="rv-property-detail"><strong>{property.name} · {property.city}</strong><p>No verified street address or coordinates are supplied by this fixture.</p></div>}
            <div className="rv-property-detail rv-location-actions"><button className="rv-button" disabled>Directions — address required</button><button className="rv-button" onClick={() => { switchDock('Work'); setIssue('Plan an authorized property visit'); }}>Plan visit</button></div>
          </section>
          <section className="rv-panel"><header className="rv-panel-head"><div><small>SPACES & CURRENT WORK</small><h2>Unit inventory</h2></div><span>{property.occupied} / {property.units} occupied</span></header>
            <div className="rv-space-grid">{units.map(unit => <button key={unit.number} className="rv-space" aria-pressed={space === unit.number} onClick={() => setSpace(space === unit.number ? null : unit.number)}>
              <strong>Unit {unit.number}</strong><span>{unit.occupied ? 'Occupied' : 'Vacant'}</span><small>Readiness unassessed</small></button>)}</div>
            <p className="rv-property-detail">Physical occupancy is a fixture fact. Readiness and construction status are independent, not inferred from vacancy.</p>
          </section>
        </> : tab === 'Files' ? <section className="rv-panel"><header className="rv-panel-head"><h2>Property files</h2></header><div className="rv-property-detail">
          <label>Choose files for review<input type="file" multiple onChange={event => setFileNames(Array.from(event.target.files ?? []).map(file => file.name))} /></label>
          <p>Names remain in this review session only. No bytes are uploaded or registered.</p>
          <ul>{fileNames.map((name, index) => <li key={`${index}-${name}`}>{name} · not uploaded</li>)}</ul>
        </div></section> : <section className="rv-panel"><header className="rv-panel-head"><h2>{tab} context</h2></header><div className="rv-property-detail">
          <p>No {tab.toLowerCase()} fixture is supplied for this record. No balances, agreements or matters are inferred.</p>
          <button className="rv-button" onClick={() => setTab('Overview')}>Return to Overview</button>
        </div></section>}
      </div>
      <aside className="rv-panel rv-context-dock" aria-label="Property context dock"><header className="rv-panel-head"><div><small>{space ? `UNIT ${space}` : 'PROPERTY'} CONTEXT</small><h2>Conversation · work · history</h2></div></header>
        <div className="rv-record-tabs">{(['Conversation', 'Work', 'History'] as const).map(value => <button key={value} aria-pressed={dock === value} onClick={() => switchDock(value)}>{value}{value === 'Conversation' && draft ? ' · draft' : ''}</button>)}</div>
        <div className="rv-property-detail">
          {dock === 'Conversation' ? <><label>Purpose<select value={purpose} onChange={event => { setPurpose(event.target.value); setPreview(false); }}><option>Maintenance / access</option><option>Account review</option></select></label>
            <div className="rv-recipient-context"><strong>{purpose === 'Account review' ? 'Avery Resident · co-obligor' : 'Jamie Access · authorized adult contact'}</strong><p>{purpose === 'Account review' ? 'Synthetic account audience; access contact excluded.' : 'Synthetic maintenance/access audience; no account detail.'}</p></div>
            <label>Reply draft<textarea value={draft} onChange={event => { onDraft(purpose, event.target.value); setPreview(false); }} /></label>
            <p>Review-session memory only · no server save or send</p><button className="rv-button" disabled={!draft.trim()} onClick={() => setPreview(true)}>Preview message</button>
            {preview ? <div className="rv-preview" role="status"><strong>Message preview · {purpose}</strong><p>{draft}</p><p>No external send is available in this review.</p></div> : null}
          </> : dock === 'Work' ? <><h3>Service intake</h3><p>{space ? `Unit ${space}` : 'Property'} · no execution record created</p><label>Issue / proposed visit<textarea value={issue} onChange={event => { setIssue(event.target.value); setPreview(false); }} /></label>
            <p>Scope, urgency, duplicate matching, access and authority require review before assignment.</p><button className="rv-button" disabled={!issue.trim()} onClick={() => setPreview(true)}>Preview request</button>{preview ? <div className="rv-preview" role="status"><strong>Request preview</strong><p>{issue}</p><p>Not saved to operating records. No vendor assigned.</p></div> : null}
          </> : <><h3>Continuous servicing record</h3><p>No operating history is loaded in this isolated scene.</p><label>Internal servicing note<textarea value={note} onChange={event => { setNote(event.target.value); setPreview(false); }} /></label><button className="rv-button" disabled={!note.trim()} onClick={() => setPreview(true)}>Preview note</button>{preview ? <div className="rv-preview" role="status">{note}<p>Not saved to the operating history.</p></div> : null}</>}
        </div>
      </aside>
    </div>
  </section>;
}
