# ECC UI state and export behavior

Reports Home uses the existing report layouts, source readers, preview and CSV
workflow. Browser workspace preferences retain table spacing only; they do not
persist account settings or business records. These pages replace two previously
unavailable navigation destinations.

Data Hub validates and applies explorer controls on submission. A query's captured
session epoch is checked before dispatch, so a previously submitted search cannot
be replayed after the session changes. Local search state also resets at that
boundary. The existing response rejection and cache purge remain in effect.

Email drafts remain in React memory while navigating inside the app. The draft
context gates values and updates by the existing session epoch, clearing its
contents at a boundary without remounting unrelated pages. Edited drafts register
a native close/reload warning. No recipient or message is stored in browser or
account persistence, and downloads do not imply that an email has been sent.

Table headers use native keyboard-operable sort controls and rows preserve their
table semantics. Record links use existing validated identities and visible
fallback labels. CSV cells share one spreadsheet-safe encoder; report snapshots
also retain their scope notes and include disclosure and rights text.

The manual workspace browser driver exercises page availability, loaded records,
keyboard actions, forms, exports, preference reload/reset, draft retention and
session clearing. The scheduler driver also checks keyboard details and credential
isolation. Local test responses are isolated inputs, never operating data.
