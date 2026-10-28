# Dashboard lease date review

The command center reuses the existing portfolio lease read and shared query key
already used by the lease list and renewal planning. No new endpoint, persistence,
schema, grant, owner, assumption, money calculation or cache policy is introduced.
The common session purge/late-response handling and error classification remain.
This is source behavior, not proof of a deployed connection or current records.

The chart reuses renewal planning's status classification, validated calendar end
dates, conflict handling and unique/usable lease identities. Only explicitly active
records with a valid end date and record link enter the date windows. Duplicate
identities and unknown/malformed/conflicting dates remain outside those counts.
The planning date follows America/Chicago and refreshes on focus and each minute.
This date clock is shared with the full renewal review.

Figures describe loaded records only; collection completeness and source freshness
are not reported. Counts group past, 0-30, 31-60, 61-90 and later days using the
existing date-only rules. Bars compare counts to the largest window, not portfolio
percentages. These are reported expiry dates, not renewal predictions or legal
notice deadlines. The chart links to the existing renewal planning workflow.

The separate lease read may succeed when the portfolio summary is unavailable.
Each source retains its own access result. Cached lease records/counts/bars are
hidden while refreshing, after any error/denial, and on malformed success. The
existing session boundary clears their shared cache. No anonymous reader or other
authentication route is added. One existing lease read may be newly needed when
opening the dashboard; list/review screens reuse the same cache and no polling or
provider sync is added.

Regression proof covers exact date-window boundaries, unknown/ended statuses,
missing/conflicting dates, duplicate/unusable identities, empty collections,
retained-data suppression and accessible count/scope labels. The manual browser
driver checks actual graph geometry, denial, refresh and workflow navigation at
desktop/mobile widths using isolated fixture responses. No operating data writes.
