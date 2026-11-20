# Stoa Swaps Dashboard — Robinhood Chain (Build Bounty entry)

Public dashboard of Stoa's swaps on Robinhood Chain (chain ID 4663):
volume, traders, and routes per venue — read **live, in the visitor's browser**,
from the public chain. No numbers are hardcoded.

- **Live page:** live preview artifact `stoa-swaps-dashboard` (card in Muse; public
  share URL pending approval — fill it in below once shared, or host these
  static files, e.g. GitHub Pages from the code repo, and use that URL).
- **Referrer / payout wallet:** `0x91be6a07b7726e10cf2fac621e08944a653035d2`
  (every trade link on the page is `https://stoadex.com/trade?ref=0x91be6a07b7726e10cf2fac621e08944a653035d2`)
- **Bounty:** “Public dashboard” — $50 in USDG on Robinhood Chain, first working
  entry, open until Sun 20 Dec 2026 23:59 UTC. Source: https://stoadex.com/build#bounties

## What it shows

- Total swaps, USD volume (all-time + last 24h), unique traders, swaps with a referrer
- Volume & swaps per UTC day (bar chart + table)
- Routes per venue (leg counts, share, leg 1 vs leg 2)
- Top traders and the full recent-swaps table (newest first, Blockscout link per tx)
- A live quote box (0.01 ETH → USDG) with the referrer already set

## Data sources (exact queries)

### 1. Primary — Robinhood Chain public JSON-RPC (works from a browser)

Endpoint: `https://rpc.mainnet.chain.robinhood.com`
(CORS `access-control-allow-origin: *`, verified 2026-11-20.)

```json
POST https://rpc.mainnet.chain.robinhood.com
{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}

POST https://rpc.mainnet.chain.robinhood.com
{"jsonrpc":"2.0","id":1,"method":"eth_getLogs","params":[{
  "fromBlock":"0x6cf3b5b",
  "toBlock":"latest",
  "address":"0x2F2804fad735a38015650f32f95Ad5E08D6B3eE5",
  "topics":["0x2bbce25631e8fa58085b7ea5929726c3acdf2df8d6b1f099eb32fb7425a4f6da"]
}]}
```

- `fromBlock 0x6cf3b5b` = 114,244,443, the deployment block in Stoa's
  `web/lib/deployments-4663.json` (`"block": 114244443`).
- The dashboard fetches in 400,000-block chunks (the public RPC is happier
  with bounded ranges) and then `eth_getBlockByNumber` (one JSON-RPC batch)
  for the timestamp of each distinct block.
- topic0 is `keccak256("Routed(address,address,address,address,address,uint256,uint256,address,address,address)")`
  = `0x2bbce256…f6da`. The event, from `contracts/src/StoaRouter.sol` (lines 119–129):

```solidity
event Routed(
    address indexed sender,
    address indexed to,
    address indexed referrer,
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 amountOut,
    address mid,
    address venue1,
    address venue2
);
```

Venue addresses are mapped with Stoa's own
[`web/lib/deployments-4663.json`](https://github.com/StoaDex/Stoa/blob/main/web/lib/deployments-4663.json)
(main branch): Uniswap V3 `0x2880…A2E6`, Uniswap V2 `0x5C85…56Be`,
Uniswap V4 (V2 adapter) `0x2795…E5c5d`, Uniswap V4 (old) `0x8965…17B8`,
Aero `0xF090…9352`, Ramses `0x87b3…8568`, Pons `0x58c2…Be0`,
Metric `0x1341…004f`, UP `0xB408…456C3`. Any venue address not in that file
is shown as “Maker pool / venue 0x…”, never guessed.

### 2. Prices — Stoa public quote API (works from a browser)

```
GET https://stoadex.com/api/v1/quote?chain=robinhood&sellToken=<token>&buyToken=0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168&amount=<raw>&slippageBps=50&taker=0x91be6a07b7726e10cf2fac621e08944a653035d2&referrer=0x91be6a07b7726e10cf2fac621e08944a653035d2
```

(CORS `access-control-allow-origin: *`, verified 2026-11-20.)
The dashboard quotes 1 ETH → USDG, 10,000 $STOA → USDG, and 1,000,000
Stoa Exchange tokens → USDG. USDG itself is $1 (6 decimals, verified on-chain).
CoinGecko (`api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd`)
is the fallback for the ETH price only.

**USD pricing rule per swap, in priority order:** USDG leg if present →
ETH/WETH leg × live ETH price → $STOA leg × live $STOA price →
Stoa Exchange leg × live quote → otherwise “unpriced” (shown as — and counted).

### 3. Cross-check — Stoa's own stats (server-side only)

```
GET https://stoadex.com/api/stats
```

The dashboard attempts this in-browser, but the endpoint sends no CORS
header, so browsers block it — the attempt is shown in “Source status” and
is never required. Verified by curl 2026-11-20 14:58 UTC:

```json
{"key":"robinhood","swaps":31,"swaps24h":1,"usdAll":634.4514009913476,
 "usd7d":634.4514009913476,"usd24h":4.015848,"first":1794682834,"ok":true}
```

### 4. Explorer — Blockscout (links only, not a data dependency)

`https://robinhoodchain.blockscout.com` — every transaction links to
`/tx/<hash>`. Its API v2 (`/api/v2/...`) returns a Cloudflare challenge
page to datacenter IPs (verified by curl 2026-11-20), so the dashboard does
not depend on it; it is attempted in-browser and its status is shown.
No solver was used to fetch it: the public RPC already returns the
authoritative logs, so there was nothing a solver could add.

## Verification log (2026-11-20, before building)

| Check | Result |
|---|---|
| `eth_chainId` on `rpc.mainnet.chain.robinhood.com` | `0x1237` = 4663 ✓ |
| `eth_getLogs` Routed, blocks 114,244,443 → latest | **31 events** |
| First / last swap | block 114,378,637 → 2026-11-14 19:00:34 UTC; block 119,031,772 → 2026-11-20 11:58:06 UTC |
| Unique traders (sender) | **18** |
| Referrers used in the 31 swaps | all `0x000…000` (0 with a referrer) |
| USDG legs | $348.03 in + $169.12 out |
| Native ETH in (all swaps) | 0.07035 ETH |
| Live quote 1 ETH → USDG | $1,738.66 (2026-11-20 14:59 UTC); CoinGecko $1,739.90 |
| Live quote 10,000 $STOA → USDG | $0.326 |
| Stoa /api/stats cross-check | 31 swaps, $634.45 all-time — matches the RPC count exactly; daily split also matches (Nov 14: 2/$3.66, Nov 16: 1/$140, Nov 17: 12/$166.68, Nov 18: 14/$270.09, Nov 19: 1/$50.00, Nov 20: 1/$4.02). The dashboard's own USD method reproduces every day except Nov 18, where the two $STOA ↔ Stoa Exchange swaps are priced from the live quote instead of their at-the-time price (gap ≈ $104). |
| Venues (legs, 39 total) | Uniswap V4 (old) 24, Uniswap V3 11, Uniswap V4 (V2) 1, Aero 1, Pons 2 |
| Pairs (top) | ETH→USDG 9, USDG→ETH 5, USDG→$STOA 3, ETH→$STOA 3, $STOA→ETH 2 |
| Token symbols/decimals | verified on-chain via `eth_call` `symbol()`/`decimals()`: USDG 6, $STOA 18, WETH 18, SPCX 18, GOOGL 18, NOVAAI 18; `0x1dd5…` is named “Stoa Exchange”, symbol STOA, 18 decimals |
| Blockscout API v2 (curl from VM) | Cloudflare “Just a moment…” challenge — NOT used as a dependency |
| `robin.etherscan.io` API (curl from VM) | same Cloudflare challenge |

## Honest state

Activity is small: 31 swaps, ~$634 volume since launch. The dashboard shows
that plainly instead of inflating it. If the live RPC fetch fails in a
visitor's browser, the page shows an error plus a clearly labelled
**OFFLINE SNAPSHOT** (last verified 2026-11-20 14:58 UTC) — never presented
as live data.

## Files

- `index.html` — page structure
- `style.css` — styling
- `app.js` — all live fetching, parsing and rendering (no libraries, no build step)
- `README.md` — this file (the shared queries the bounty requires)
- `SUBMISSION-DRAFT.md` — the GitHub issue title + body, ready to paste

## Run locally

```sh
cd build-bounty-dashboard && python3 -m http.server 8000
# open http://localhost:8000/
```

## Referrer mechanism

Every swap/trade link on the page uses
`https://stoadex.com/trade?ref=0x91be6a07b7726e10cf2fac621e08944a653035d2`,
and every quote request sends `referrer=0x91be6a07b7726e10cf2fac621e08944a653035d2`.
Per Stoa's docs, the referrer earns 10% of Stoa's 2 bps fee, booked to the
address in the FeeDistributor contract. No wash trading: the dashboard only
reads the chain and links out — it never sends a swap itself.
