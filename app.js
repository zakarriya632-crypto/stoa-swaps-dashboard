/* Stoa swaps dashboard — Robinhood Chain (4663).
 * Live sources only. Nothing is hardcoded except contract config that is
 * itself on-chain / in Stoa's public repo (see README.md for the proofs).
 * If a live fetch fails, the page says so and shows the labelled offline
 * snapshot instead of pretending the snapshot is live.
 */
'use strict';
const RPC = 'https://rpc.mainnet.chain.robinhood.com';
const QUOTE = 'https://stoadex.com/api/v1/quote';
const STATS = 'https://stoadex.com/api/stats';
const EXPLORER = 'https://robinhoodchain.blockscout.com';
const ROUTER = '0x2f2804fad735a38015650f32f95ad5e08d6b3ee5';
const DEPLOY_BLOCK = 114244443; // deployments-4663.json "block"
const TOPIC0 = '0x2bbce25631e8fa58085b7ea5929726c3acdf2df8d6b1f099eb32fb7425a4f6da';
// keccak256("Routed(address,address,address,address,address,uint256,uint256,address,address,address)")
const REFERRER = '0x91be6a07b7726e10cf2fac621e08944a653035d2';
const USDG = '0x5fc5360d0400a0fd4f2af552add042d716f1d168';
const WETH = '0x0bd7d308f8e1639fab988df18a8011f41eacad73';
const STOA = '0x13e6993417616de724f2b337d65063f229e96718';
const STOA_EX = '0x1dd577f4c1b9a201cb099af9af74dcac012395c9'; // name "Stoa Exchange", symbol STOA
const ZERO = '0x0000000000000000000000000000000000000000';

const TOKENS = {
  [ZERO]: { symbol: 'ETH', decimals: 18 },
  [USDG]: { symbol: 'USDG', decimals: 6 },
  [STOA]: { symbol: 'STOA', decimals: 18 },
  [WETH]: { symbol: 'WETH', decimals: 18 },
  '0x4a0e65a3eccec6dbe60ae065f2e7bb85fae35eea': { symbol: 'SPCX', decimals: 18 },
  '0x2e0847e8910a9732eb3fb1bb4b70a580adad4fe3': { symbol: 'GOOGL', decimals: 18 },
  '0x51250b135174ca09450ec01c4aff73cf69dbb590': { symbol: 'NOVAAI', decimals: 18 },
  [STOA_EX]: { symbol: 'STOA*', name: 'Stoa Exchange', decimals: 18 },
};
// Venue addresses from Stoa's web/lib/deployments-4663.json (main branch).
const VENUES = {
  '0x28802ad6f9859d14dfc6226ea9a8b60686d3a2e6': 'Uniswap V3',
  '0x5c8537e7d755884326de0969ce7bdb14195f56be': 'Uniswap V2',
  '0x27958279f95225b2a5517e7dd12b6fc0317e5c5d': 'Uniswap V4 (V2 adapter)',
  '0x8965140fb51b2e99a0cd31a0e99eae01d36517b8': 'Uniswap V4 (old adapter)',
  '0xf0904b95d66f565de215cc7dc58b6054f72a9352': 'Aero',
  ['0x87b3b896beabdC421f9d9b0a3fd3dbbae1ddd568'.toLowerCase()]: 'Ramses',
  '0x58c2c83b66088b57b9dd487ba1090992bc9eebe0': 'Pons',
  '0x1341db53ed69ce1def86bdbfc60d5fd92cf9004f': 'Metric',
  '0xb40892c77bc4a1aba744c1afd96fce048d6456c3': 'UP',
};
const $ = (id) => document.getElementById(id);
const short = (a) => a.slice(0, 6) + '…' + a.slice(-4);
const fmtUsd = (v) => v == null ? '—' : '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtAmt = (raw, dec) => {
  const v = Number(raw) / 10 ** dec;
  return v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : v.toLocaleString('en-US', { maximumFractionDigits: 6 });
};
const tokenLabel = (a) => {
  const t = TOKENS[a.toLowerCase()];
  return t ? t.symbol : short(a);
};
const venueLabel = (a) => {
  if (!a || a === ZERO) return '—';
  return VENUES[a.toLowerCase()] || ('Maker pool / venue ' + short(a));
};
const tradeUrl = () => 'https://stoadex.com/trade?ref=' + REFERRER;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function rpcCall(method, params) {
  const r = await fetch(RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  if (!r.ok) throw new Error('RPC HTTP ' + r.status);
  const j = await r.json();
  if (j.error) throw new Error('RPC: ' + JSON.stringify(j.error));
  return j.result;
}
async function rpcBatch(calls) {
  const r = await fetch(RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(calls.map((c, i) => ({ jsonrpc: '2.0', id: i + 1, method: c[0], params: c[1] }))) });
  if (!r.ok) throw new Error('RPC batch HTTP ' + r.status);
  return r.json();
}
async function fetchQuote(sellToken, amountRaw) {
  const u = new URL(QUOTE);
  u.searchParams.set('chain', 'robinhood');
  u.searchParams.set('sellToken', sellToken);
  u.searchParams.set('buyToken', USDG);
  u.searchParams.set('amount', amountRaw);
  u.searchParams.set('slippageBps', '50');
  u.searchParams.set('taker', REFERRER);
  u.searchParams.set('referrer', REFERRER);
  const r = await fetch(u.toString());
  if (!r.ok) throw new Error('quote HTTP ' + r.status);
  return r.json();
}
function parseRouted(log) {
  const words = log.data.slice(2).match(/.{1,64}/g) || [];
  const addr = (w) => '0x' + w.slice(-40);
  return {
    block: parseInt(log.blockNumber, 16),
    tx: log.transactionHash,
    sender: addr(log.topics[1]),
    to: addr(log.topics[2]),
    referrer: addr(log.topics[3]),
    tokenIn: addr(words[0]), tokenOut: addr(words[1]),
    amountIn: BigInt('0x' + words[2]), amountOut: BigInt('0x' + words[3]),
    mid: addr(words[4]), venue1: addr(words[5]), venue2: addr(words[6]),
  };
}
function usdOf(s, prices) {
  const inUsdg = s.tokenIn.toLowerCase() === USDG, outUsdg = s.tokenOut.toLowerCase() === USDG;
  if (inUsdg) return Number(s.amountIn) / 1e6;
  if (outUsdg) return Number(s.amountOut) / 1e6;
  const ethLeg = (a, amt) => (a.toLowerCase() === ZERO || a.toLowerCase() === WETH) ? Number(amt) / 1e18 * prices.eth : null;
  const e1 = ethLeg(s.tokenIn, s.amountIn), e2 = ethLeg(s.tokenOut, s.amountOut);
  if (e1 != null) return e1; if (e2 != null) return e2;
  const stoaLeg = (a, amt) => a.toLowerCase() === STOA ? Number(amt) / 1e18 * prices.stoa : null;
  const s1 = stoaLeg(s.tokenIn, s.amountIn), s2 = stoaLeg(s.tokenOut, s.amountOut);
  if (s1 != null) return s1; if (s2 != null) return s2;
  const seLeg = (a, amt) => a.toLowerCase() === STOA_EX ? Number(amt) / 1e18 * prices.stoaEx : null;
  const x1 = seLeg(s.tokenIn, s.amountIn), x2 = seLeg(s.tokenOut, s.amountOut);
  if (x1 != null) return x1; if (x2 != null) return x2;
  return null; // unpriced: no USDG / ETH / STOA / Stoa Exchange leg
}

async function load() {
  const statusEl = $('status'), srcEl = $('source-status');
  const sources = [];
  statusEl.textContent = 'Loading live data from the Robinhood Chain RPC…';
  statusEl.className = 'status';
  try {
    // 1. Prices (Stoa quote API; CoinGecko fallback for ETH only).
    const prices = { eth: null, stoa: null, stoaEx: null };
    try {
      const q = await fetchQuote(ZERO, '1000000000000000000'); // 1 ETH -> USDG
      prices.eth = parseInt(q.amountOut, 10) / 1e6;
      sources.push('Stoa quote API (ETH price): OK — 1 ETH = $' + prices.eth.toFixed(2));
    } catch (e) {
      try {
        const cg = await (await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')).json();
        prices.eth = cg.ethereum.usd;
        sources.push('Stoa quote API (ETH price): failed (' + e.message + '); CoinGecko fallback OK — 1 ETH = $' + prices.eth);
      } catch (e2) { sources.push('ETH price: FAILED (' + e2.message + ') — ETH legs will be unpriced'); }
    }
    try {
      const q = await fetchQuote(STOA, '10000000000000000000000'); // 10,000 STOA -> USDG
      prices.stoa = parseInt(q.amountOut, 10) / 1e6 / 10000;
      sources.push('Stoa quote API ($STOA price): OK — 1 STOA = $' + prices.stoa.toFixed(6));
    } catch (e) { sources.push('$STOA price: FAILED (' + e.message + ')'); }
    try {
      const q = await fetchQuote(STOA_EX, '1000000000000000000000000'); // 1,000,000 Stoa Exchange -> USDG
      prices.stoaEx = parseInt(q.amountOut, 10) / 1e6 / 1000000;
      sources.push('Stoa quote API (Stoa Exchange token price): OK — 1 token = $' + prices.stoaEx.toFixed(6));
    } catch (e) { sources.push('Stoa Exchange token price: FAILED (' + e.message + ')'); }

    // 2. All Routed logs, chunked (public RPC rejects very wide ranges sometimes).
    const latest = parseInt(await rpcCall('eth_blockNumber', []), 16);
    const CHUNK = 400000;
    let logs = [];
    for (let from = DEPLOY_BLOCK; from <= latest; from += CHUNK) {
      const to = Math.min(from + CHUNK - 1, latest);
      statusEl.textContent = 'Reading Routed logs… blocks ' + from.toLocaleString() + '–' + to.toLocaleString() + ' (' + logs.length + ' swaps so far)';
      const part = await rpcCall('eth_getLogs', [{ fromBlock: '0x' + from.toString(16), toBlock: '0x' + to.toString(16), address: ROUTER, topics: [TOPIC0] }]);
      logs = logs.concat(part);
    }
    sources.push('Robinhood RPC eth_getLogs: OK — ' + logs.length + ' Routed events, blocks ' + DEPLOY_BLOCK + '–' + latest);
    const swaps = logs.map(parseRouted).sort((a, b) => a.block - b.block);

    // 3. Block timestamps (one JSON-RPC batch).
    const blocks = [...new Set(swaps.map((s) => s.block))];
    let tsByBlock = {};
    try {
      const res = await rpcBatch(blocks.map((b) => ['eth_getBlockByNumber', ['0x' + b.toString(16), false]]));
      res.forEach((r, i) => { if (r.result) tsByBlock[blocks[i]] = parseInt(r.result.timestamp, 16); });
    } catch (e) {
      for (const b of blocks) { const r = await rpcCall('eth_getBlockByNumber', ['0x' + b.toString(16), false]); tsByBlock[b] = parseInt(r.timestamp, 16); }
    }
    swaps.forEach((s) => { s.time = tsByBlock[s.block] || 0; s.usd = usdOf(s, prices); });

    // 4. Optional cross-checks (expected to fail in some browsers; never fatal).
    try {
      const st = await (await fetch(STATS)).json();
      const rh = st.chains.find((c) => c.key === 'robinhood');
      sources.push('Stoa /api/stats: OK — cross-check ' + rh.swaps + ' swaps, $' + rh.usdAll.toFixed(2) + ' all-time (server count)');
    } catch (e) { sources.push('Stoa /api/stats: not readable from this browser (' + e.message + ') — expected, it sends no CORS header; totals above come from the RPC, and the server count was verified by curl on 2026-11-20'); }
    try {
      const bs = await (await fetch(EXPLORER + '/api/v2/stats')).json();
      sources.push('Blockscout API v2: OK — chain at block ' + (bs.total_blocks || '?'));
    } catch (e) { sources.push('Blockscout API v2: not readable from this browser (' + e.message + ') — it is Cloudflare-challenged from datacenter IPs; explorer links below still work'); }

    render(swaps, prices, latest);
    const now = new Date();
    $('updated').textContent = 'Last updated ' + now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC · auto-refreshes every 5 min';
    statusEl.textContent = 'Live: ' + swaps.length + ' swaps read from the Robinhood Chain RPC just now. No hardcoded numbers.';
    statusEl.className = 'status ok';
    $('snapshot').hidden = true;
  } catch (e) {
    statusEl.textContent = 'Live data failed to load from this browser: ' + e.message + '. See the labelled offline snapshot below — it is NOT live data.';
    statusEl.className = 'status bad';
    $('snapshot').hidden = false;
    sources.push('Robinhood RPC: FAILED — ' + e.message);
  }
  srcEl.innerHTML = sources.map((s) => '<li>' + esc(s) + '</li>').join('');
}

function render(swaps, prices, latestBlock) {
  const priced = swaps.filter((s) => s.usd != null);
  const usdTotal = priced.reduce((a, s) => a + s.usd, 0);
  const traders = new Set(swaps.map((s) => s.sender.toLowerCase()));
  const nowSec = Math.floor(Date.now() / 1000);
  const last24h = swaps.filter((s) => s.time && nowSec - s.time <= 86400);
  const usd24h = last24h.reduce((a, s) => a + (s.usd || 0), 0);
  $('k-swaps').textContent = swaps.length.toLocaleString();
  $('k-swaps-sub').textContent = swaps.length ? ('first ' + new Date(swaps[0].time * 1000).toISOString().slice(0, 10) + ' → last ' + new Date(swaps[swaps.length - 1].time * 1000).toISOString().slice(0, 10)) : '';
  $('k-usd').textContent = fmtUsd(usdTotal);
  $('k-traders').textContent = traders.size.toLocaleString();
  $('k-traders-sub').textContent = (swaps.length - priced.length) + ' swap(s) unpriced (no USDG/ETH/$STOA leg)';
  $('k-24h').textContent = last24h.length.toLocaleString();
  $('k-usd24h').textContent = fmtUsd(usd24h) + ' in the last 24h';
  $('k-ref').textContent = swaps.filter((s) => s.referrer.toLowerCase() !== ZERO).length + ' of ' + swaps.length;
  $('k-eth').textContent = prices.eth ? '$' + prices.eth.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—';

  // Daily bars + table (UTC).
  const perDay = {};
  swaps.forEach((s) => {
    const d = s.time ? new Date(s.time * 1000).toISOString().slice(0, 10) : 'unknown';
    perDay[d] = perDay[d] || { n: 0, usd: 0 };
    perDay[d].n += 1; perDay[d].usd += s.usd || 0;
  });
  const days = Object.keys(perDay).sort();
  const maxUsd = Math.max(1, ...days.map((d) => perDay[d].usd));
  $('daily-bars').innerHTML = days.map((d) => {
    const h = Math.max(2, Math.round(perDay[d].usd / maxUsd * 88));
    return '<div class="bar" title="' + d + ': ' + perDay[d].n + ' swaps, ' + fmtUsd(perDay[d].usd) + '"><b>' + fmtUsd(perDay[d].usd) + '</b><i style="height:' + h + 'px"></i><span>' + d.slice(5) + '</span></div>';
  }).join('');
  document.querySelector('#daily-table tbody').innerHTML = days.map((d) =>
    '<tr><td>' + d + '</td><td>' + perDay[d].n + '</td><td>' + fmtUsd(perDay[d].usd) + '</td></tr>').join('');

  // Venues (count legs, not swaps).
  const legs = {};
  swaps.forEach((s) => {
    [s.venue1, s.venue2].forEach((v, i) => {
      if (!v || v === ZERO) return;
      legs[v.toLowerCase()] = legs[v.toLowerCase()] || { name: venueLabel(v), addr: v, n: 0, leg1: 0, leg2: 0 };
      legs[v.toLowerCase()].n += 1;
      if (i === 0) legs[v.toLowerCase()].leg1 += 1; else legs[v.toLowerCase()].leg2 += 1;
    });
  });
  const legList = Object.values(legs).sort((a, b) => b.n - a.n);
  const legTotal = legList.reduce((a, v) => a + v.n, 0) || 1;
  document.querySelector('#venue-table tbody').innerHTML = legList.map((v) =>
    '<tr><td>' + esc(v.name) + '<br><span class="muted">' + esc(v.addr) + '</span></td><td>' + v.n + '</td><td>' + (100 * v.n / legTotal).toFixed(1) + '%</td><td>' + v.leg1 + '</td><td>' + v.leg2 + '</td></tr>').join('') ||
    '<tr><td colspan="5">No venue legs found.</td></tr>';

  // Top traders.
  const byTrader = {};
  swaps.forEach((s) => {
    byTrader[s.sender] = byTrader[s.sender] || { n: 0, usd: 0 };
    byTrader[s.sender].n += 1; byTrader[s.sender].usd += s.usd || 0;
  });
  document.querySelector('#trader-table tbody').innerHTML = Object.entries(byTrader)
    .sort((a, b) => b[1].n - a[1].n).slice(0, 20).map(([a, v]) =>
      '<tr><td><a href="' + EXPLORER + '/address/' + a + '" target="_blank" rel="noopener">' + esc(a) + '</a></td><td>' + v.n + '</td><td>' + fmtUsd(v.usd) + '</td></tr>').join('');

  // Recent swaps, newest first.
  document.querySelector('#swap-table tbody').innerHTML = [...swaps].reverse().map((s) => {
    const tIn = TOKENS[s.tokenIn.toLowerCase()] || { symbol: short(s.tokenIn), decimals: 18 };
    const tOut = TOKENS[s.tokenOut.toLowerCase()] || { symbol: short(s.tokenOut), decimals: 18 };
    const when = s.time ? new Date(s.time * 1000).toISOString().replace('T', ' ').slice(0, 19) : '—';
    const route = venueLabel(s.venue1) + (s.venue2 && s.venue2 !== ZERO ? ' → ' + venueLabel(s.venue2) : '') + (s.mid !== ZERO ? ' (via ' + tokenLabel(s.mid) + ')' : '');
    return '<tr><td>' + when + '</td><td><a href="' + EXPLORER + '/address/' + s.sender + '" target="_blank" rel="noopener">' + esc(short(s.sender)) + '</a></td>' +
      '<td>' + fmtAmt(s.amountIn, tIn.decimals) + ' ' + esc(tIn.symbol) + ' → ' + fmtAmt(s.amountOut, tOut.decimals) + ' ' + esc(tOut.symbol) + '</td>' +
      '<td>' + fmtUsd(s.usd) + '</td><td>' + esc(route) + '</td>' +
      '<td><a href="' + EXPLORER + '/tx/' + s.tx + '" target="_blank" rel="noopener">Blockscout ↗</a> · <a href="' + tradeUrl() + '" target="_blank" rel="noopener">Trade ↗</a></td></tr>';
  }).join('');

  // Live quote box: 0.01 ETH -> USDG, referrer set.
  (async () => {
    try {
      const q = await fetchQuote(ZERO, '10000000000000000');
      $('quote-box').innerHTML = '0.01 ETH → <b>' + (parseInt(q.amountOut, 10) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' USDG</b>' +
        ' (min out ' + (parseInt(q.minOut, 10) / 1e6).toFixed(2) + ', route: ' + esc((q.route.legs || []).map((l) => l.name).join(' → ') || '—') + ', quoted ' + new Date(q.quotedAt * 1000).toISOString().slice(11, 19) + ' UTC, valid 30s). Referrer in the quote: <code>' + esc(REFERRER) + '</code>.';
    } catch (e) { $('quote-box').textContent = 'Live quote failed to load: ' + e.message + '. Open the swap on Stoa with the referrer link below — the referrer is in the URL.'; }
  })();
}

$('refresh').addEventListener('click', load);
load();
setInterval(load, 300000);
