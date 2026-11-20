# Submission draft — DO NOT SUBMIT without Zack's tap

Submit at: https://github.com/StoaDex/Stoa/issues/new?title=Bounty%3A%20&labels=bounty
(blank issue in StoaDex/Stoa, title pre-filled "Bounty: ", no template)

## Title

```
Bounty: Public dashboard of Stoa swaps on Robinhood Chain
```

## Body (paste as-is, after replacing LIVE-LINK and CODE-LINK)

```
Entry for the public dashboard build bounty (https://stoadex.com/build#bounties).

Live dashboard: https://muse.ai/s/stoa-swaps-dashboard-nz77tnxuxydxrb/eiqLIJAJRJjwOpNvUF1uQtfsX2dqT8bWTMSMOui7u2c
<!-- Public share URL of artifact `stoa-swaps-dashboard`, shared 2026-11-20 on Zack's tap. -->
Code (open source, MIT): <CODE-LINK>

What it does
- Public dashboard of Stoa's swaps on Robinhood Chain (chain 4663): total swaps,
  USD volume (all-time + last 24h), unique traders, volume & swaps per day,
  routes per venue, top traders, and the full recent-swaps table with a
  Blockscout link per transaction.
- Nothing is hardcoded. On every load the page fetches live data in the
  browser: all `Routed` events from StoaRouter
  0x2F2804fad735a38015650f32f95Ad5E08D6B3eE5 via the public Robinhood Chain
  JSON-RPC (eth_getLogs from deployment block 114,244,443), block timestamps
  via eth_getBlockByNumber, and live prices via Stoa's public quote API.
  Venue names come from Stoa's own web/lib/deployments-4663.json.
- Current state (verified live 2026-11-20, and matching Stoa's own /api/stats):
  31 swaps since launch, 18 unique traders, $634.45 all-time volume.
  First swap 2026-11-14, latest 2026-11-20. Activity is small and the
  dashboard shows that honestly instead of inflating it.
- Routes per venue (legs): Uniswap V4 (old adapter) 24, Uniswap V3 11,
  Uniswap V4 (V2 adapter) 1, Aero 1, Pons 2.
- The README in the repo documents every query used (RPC calls, event
  signature/topic, quote calls, pricing rule) so the numbers are reproducible.

Referrer mechanism
- Every swap/trade link on the dashboard is
  https://stoadex.com/trade?ref=0x91be6a07b7726e10cf2fac621e08944a653035d2
  and every quote request sends referrer=0x91be6a07b7726e10cf2fac621e08944a653035d2.
- Payout wallet (USDG on Robinhood Chain):
  0x91be6a07b7726e10cf2fac621e08944a653035d2

Notes
- Live and public; code is open on GitHub (link above).
- The dashboard only reads the chain and links out to Stoa — it never sends
  a swap itself, and no wash trading is involved.
```

## Checklist before submitting

- [ ] Replace `<LIVE-LINK>` with the published dashboard URL.
- [ ] Replace `<CODE-LINK>` with the public GitHub repo URL (open source, MIT).
- [ ] Confirm the live link loads and shows the 31 swaps / $634.45 figures.
- [ ] Zack's tap to submit (filing is via his own browser as zakarriya632-crypto,
      never via Muse's GitHub connector).
