# Nephthys Dashboard Extension Recommendations (by codex cause i cant afford claude </3)

Havent hade time to review this so yk take it with a grain of salt

## Product

- Add Slack OAuth and require Hack Club workspace membership before exposing helper-only operational data.
- Keep resolving Slack IDs through Cachet server-side, and cache profile lookups aggressively to avoid unnecessary profile traffic.
- Add SLA buckets for open tickets: under 24h, 1-3d, 3-7d, and over 7d.
- Add saved views for common queues such as unassigned open tickets, in-progress tickets, and stale reopened tickets.
- Add a ticket detail drawer using `/api/ticket?id=` so helpers can inspect metadata without leaving the dashboard.

## Data

- Add a time-series endpoint in Nephthys for daily created, assigned, and closed ticket counts instead of inferring trends client-side.
- Add team tag aggregation to spot which support areas create the most load.
- Add percentile timings such as p50, p90, and p99 resolution time; means are too sensitive to stale outliers.
- Add explicit pagination metadata to `/api/tickets` for safer broad filters.

## Operations

- Deploy on a Next.js server runtime, not static hosting, because Nephthys and Cachet calls happen server-side.
- Keep a short Nephthys cache, currently 30 seconds, and a longer Cachet cache, currently 6 hours.
- Add structured logging around upstream failures and slow Nephthys responses.
- Use `NEPHTHYS_HOST` and `CACHET_HOST` environment variables so staging can point at alternate data sources.
