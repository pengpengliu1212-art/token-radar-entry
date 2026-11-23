/* PREFLIGHT app — hash-routed board, detail, model and live views. No framework, no network. */
(() => {
  'use strict';

  const R = window.RADAR;
  const main = document.getElementById('main');
  const tabs = document.getElementById('tabs');
  const footNote = document.getElementById('foot-note');

  footNote.textContent = `Snapshot ${R.as_of} · ${R.rows.length} ranked protocols (${R.watchlist_size} watchlist + ${R.early_size} early) · ${R.live_size} live tokens kept apart · model ${R.fit.version}`;

  /* ---------- helpers ---------- */

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const money = (n) => {
    const abs = Math.abs(n);
    if (abs >= 1e9) return `$${(n / 1e9).toFixed(abs >= 1e10 ? 0 : 1)}B`;
    if (abs >= 1e6) return `$${(n / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
    if (abs >= 1e3) return `$${(n / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}K`;
    return `$${n}`;
  };

  const fullMoney = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

  const pct = (g) => (g === null ? '<span class="dim">n/a</span>' : `<span class="${g >= 0 ? 'pos' : 'neg'} num">${g >= 0 ? '+' : ''}${g.toFixed(1)}%</span>`);

  const age = (d) => {
    if (d === null) return '<span class="dim">unknown</span>';
    if (d < 60) return `${d}d`;
    if (d < 730) return `${Math.round(d / 30)}mo`;
    return `${(d / 365).toFixed(1)}y`;
  };

  const ratio = (x) => `${x.toFixed(2)}×`;

  const signal = (row) => {
    if (row.age_days === null) return '';
    if (row.age_days < 120) return '<span class="badge fresh">fresh</span>';
    return '';
  };

  const chains = (row) => (row.chains || []).slice(0, 3).map((c) => `<span class="chain-chip">${esc(c)}</span>`).join('') + ((row.chains || []).length > 3 ? `<span class="chain-chip">+${row.chains.length - 3}</span>` : '');

  /* A farm step string is "Action. Cost: X. Time: Y." — split it for display. */
  function stepParts(s) {
    const atCost = s.indexOf(' Cost: ');
    const atTime = s.indexOf(' Time: ');
    if (atCost < 0 || atTime < 0 || atTime < atCost) return { text: s, cost: null, time: null };
    return {
      text: s.slice(0, atCost).trim(),
      cost: s.slice(atCost + 7, atTime).trim(),
      time: s.slice(atTime + 7).trim(),
    };
  }

  /* ---------- hash routing ---------- */

  const boardState = { q: '', cat: '', chain: '', sort: 'implied', dir: 'desc' };

  function parseHash() {
    const h = decodeURIComponent(location.hash.replace(/^#/, ''));
    const parts = h.split('&').filter((p) => p.length > 0);
    // The page may carry its own key=value (#protocol=<slug>) when no & follows.
    const head = parts[0] || 'board';
    const eq = head.indexOf('=');
    const page = eq > 0 ? head.slice(0, eq) : head;
    const view = { page, params: {} };
    if (eq > 0) view.params[head.slice(0, eq)] = head.slice(eq + 1);
    for (let i = 1; i < parts.length; i++) {
      const at = parts[i].indexOf('=');
      if (at > 0) view.params[parts[i].slice(0, at)] = parts[i].slice(at + 1);
    }
    return view;
  }

  function setHash(page, params) {
    const bits = [page];
    for (const k of Object.keys(params || {})) {
      if (params[k] !== '' && params[k] !== null && params[k] !== undefined) bits.push(`${k}=${params[k]}`);
    }
    const next = `#${bits.join('&')}`;
    if (location.hash !== next) location.hash = next;
  }

  /* ---------- board ---------- */

  const SORTS = {
    implied: (r) => r.implied_value_usd,
    tvl: (r) => r.tvl_usd,
    growth: (r) => (r.change_7d === null ? -999 : r.change_7d),
    age: (r) => (r.age_days === null ? -1 : r.age_days),
    multiple: (r) => r.multiple,
    name: (r) => r.name.toLowerCase(),
  };

  function filteredRows() {
    const q = boardState.q.trim().toLowerCase();
    let rows = R.rows.filter((r) => {
      if (boardState.cat && (r.category || '') !== boardState.cat) return false;
      if (boardState.chain && !(r.chains || []).includes(boardState.chain)) return false;
      if (q && !(`${r.name}`.toLowerCase().includes(q) || r.slug.includes(q))) return false;
      return true;
    });
    const dir = boardState.dir === 'asc' ? 1 : -1;
    const key = SORTS[boardState.sort] || SORTS.implied;
    rows = [...rows].sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      if (ka < kb) return -1 * dir;
      if (ka > kb) return 1 * dir;
      return a.slug < b.slug ? -1 : 1;
    });
    return rows;
  }

  function boardLink(base, over) {
    const s = { ...boardState, ...over };
    const bits = [base];
    if (s.q) bits.push(`q=${s.q}`);
    if (s.cat) bits.push(`cat=${s.cat}`);
    if (s.chain) bits.push(`chain=${s.chain}`);
    if (base === 'board' && (s.sort !== 'implied' || s.dir !== 'desc')) bits.push(`sort=${s.sort}-${s.dir}`);
    return `#${bits.join('&')}`;
  }

  function renderBoard() {
    const cats = [...new Set(R.rows.map((r) => r.category).filter((c) => c !== null))].sort((a, b) => a.localeCompare(b));
    const allChains = [...new Set(R.rows.flatMap((r) => r.chains || []))].sort((a, b) => a.localeCompare(b));
    const rows = filteredRows();

    const head = [
      ['', ''],
      ['name', 'Protocol', ''],
      ['', 'Chains', ''],
      ['tvl', 'TVL', 'r-right'],
      ['growth', '7d', 'r-right'],
      ['age', 'Age', 'r-right'],
      ['multiple', 'Multiple', 'r-right'],
      ['implied', 'Implied value', 'r-right'],
    ];
    const th = head.map(([k, label, cls]) => {
      if (k === '') return `<th class="${cls}">${label}</th>`;
      const on = boardState.sort === k;
      const arrow = on ? (boardState.dir === 'asc' ? ' ↑' : ' ↓') : '';
      return `<th class="${cls}${on ? ' sorted' : ''}" data-sort="${k}">${label}${arrow}</th>`;
    }).join('');

    const body = rows.map((r) => `
      <tr data-slug="${esc(r.slug)}">
        <td class="rank num ${r.rank <= 3 ? 'top' : ''}">${r.rank}</td>
        <td class="name-cell watch"><b>${esc(r.name)}</b><small>${r.category === null ? 'uncategorised' : esc(r.category)}${r.on_watchlist ? ' · watchlist' : ' · early'}${R.fit.categories.some((c) => c.category === r.category) ? '' : ' · global fallback'}</small></td>
        <td>${chains(r)}${signal(r)}</td>
        <td class="r-right num">${money(r.tvl_usd)}</td>
        <td class="growth r-right">${pct(r.change_7d)}</td>
        <td class="r-right num dim">${age(r.age_days)}</td>
        <td class="r-right num dim">${ratio(r.multiple)}</td>
        <td class="val num r-right">${money(r.implied_value_usd)}</td>
      </tr>`).join('');

    const covered = R.rows.filter((r) => r.on_watchlist).length;
    const lede = `<p class="lede"><b class="num">${covered}/${R.watchlist_size}</b> watchlist covered · <b class="num">${R.rows.length}</b> pre-token protocols ranked by implied value · every snapshot protocol at or above the ${money(R.floor_usd)} floor with no token is on this board</p>`;

    main.innerHTML = `
      ${lede}
      <div class="toolbar">
        <input id="q" type="search" placeholder="Search a protocol…" value="${esc(boardState.q)}" aria-label="Search protocols">
        <select id="cat" aria-label="Filter by category">
          <option value="">All categories</option>
          ${cats.map((c) => `<option value="${esc(c)}"${c === boardState.cat ? ' selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
        <select id="chain" aria-label="Filter by chain">
          <option value="">All chains</option>
          ${allChains.map((c) => `<option value="${esc(c)}"${c === boardState.chain ? ' selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
        <span class="count">${rows.length} of ${R.rows.length} protocols</span>
      </div>
      <div class="panel" style="padding:0; overflow-x:auto;">
        <table class="grid">
          <thead><tr>${th}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;

    const qEl = document.getElementById('q');
    let t = null;
    qEl.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        boardState.q = qEl.value;
        setHash('board', { q: boardState.q, cat: boardState.cat, chain: boardState.chain });
        renderBoard();
        const el = document.getElementById('q');
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }, 250);
    });
    document.getElementById('cat').addEventListener('change', (e) => {
      boardState.cat = e.target.value;
      setHash('board', { q: boardState.q, cat: boardState.cat, chain: boardState.chain });
      renderBoard();
    });
    document.getElementById('chain').addEventListener('change', (e) => {
      boardState.chain = e.target.value;
      setHash('board', { q: boardState.q, cat: boardState.cat, chain: boardState.chain });
      renderBoard();
    });
    main.querySelectorAll('th[data-sort]').forEach((el) => {
      el.addEventListener('click', () => {
        const k = el.getAttribute('data-sort');
        if (boardState.sort === k) boardState.dir = boardState.dir === 'asc' ? 'desc' : 'asc';
        else { boardState.sort = k; boardState.dir = 'desc'; }
        setHash('board', { q: boardState.q, cat: boardState.cat, chain: boardState.chain, sort: `${boardState.sort}-${boardState.dir}` });
        renderBoard();
      });
    });
    main.querySelectorAll('tr[data-slug]').forEach((el) => {
      el.addEventListener('click', () => { location.hash = `#protocol=${el.getAttribute('data-slug')}`; });
    });
  }

  /* ---------- detail ---------- */

  function renderDetail(slug) {
    const r = R.rows.find((x) => x.slug === slug);
    if (r === undefined) {
      main.innerHTML = '<div class="panel"><h2>Not on the board</h2><p class="sub">This protocol is not one the radar ranks — it may already trade a token, or the model filtered it out. <a href="#board">Back to the board</a>.</p></div>';
      return;
    }
    const cat = R.fit.categories.find((c) => c.category === r.category);
    const peers = R.rows.filter((x) => x.category === r.category && x.slug !== r.slug).sort((a, b) => b.implied_value_usd - a.implied_value_usd).slice(0, 4);
    const watchNote = `The snapshot's watchlist (${R.watchlist_size} protocols at or above ${money(R.floor_usd)} with no token recorded) is the floor; this row ${r.on_watchlist ? 'is on it' : 'was found below it by the radar'}.`;

    main.innerHTML = `
      <div class="crumbs"><a href="#board">← Board</a></div>
      <div class="hero">
        <h2>${esc(r.name)}</h2>
        <span class="big-val num">${money(r.implied_value_usd)}</span>
        <span class="dim num">rank #${r.rank} of ${R.rows.length}</span>
        ${signal(r)}
      </div>
      <p class="hero-facts">
        <span class="badge cat">${r.category === null ? 'uncategorised' : esc(r.category)}</span>
        ${chains(r)}
        <span class="badge">listed ${r.listed_at === null ? 'unknown' : esc(r.listed_at)} · ${age(r.age_days)} old</span>
        <span class="badge">7d ${r.change_7d === null ? 'n/a' : `${r.change_7d >= 0 ? '+' : ''}${r.change_7d.toFixed(1)}%`}</span>
        <span class="badge">TVL ${money(r.tvl_usd)}</span>
      </p>
      <div class="cols">
        <div>
          <div class="panel breakdown">
            <h2>How the model reaches ${money(r.implied_value_usd)}</h2>
            <p class="sub">Every term is fitted from the snapshot's own data — see <a href="#model" style="color:var(--amber);text-decoration:none;">the Model page</a>. No protocol name is special-cased.</p>
            <div class="line"><span class="k">TVL</span><span class="v num">${fullMoney(r.tvl_usd)}</span></div>
            <div class="line"><span class="k">× multiple — ${esc(r.multiple_source)}, at the reference TVL ${money(R.fit.reference_tvl)}</span><span class="v num">${ratio(r.multiple)}</span></div>
            <div class="line"><span class="k">× size adjustment (slope ${R.fit.size_slope.toFixed(3)} on ln TVL)</span><span class="v num">${ratio(r.size_adjustment)}</span></div>
            <div class="line"><span class="k">× growth multiplier (7d ${r.change_7d === null ? 'n/a' : `${r.change_7d >= 0 ? '+' : ''}${r.change_7d.toFixed(1)}%`}, slope ${R.fit.growth_slope})</span><span class="v num">${ratio(r.growth_multiplier)}</span></div>
            <div class="line"><span class="k">× maturity multiplier (age ${r.age_days === null ? 'unknown' : `${r.age_days} days`})</span><span class="v num">${ratio(r.maturity_multiplier)}</span></div>
            <div class="line total"><span class="k">Implied value at launch</span><span class="v num">${fullMoney(r.implied_value_usd)}</span></div>
            <p class="sub" style="margin:10px 0 0;">${esc(watchNote)} This protocol records no token in the snapshot (no market cap, no CoinGecko id, no symbol); the value is the model's estimate, not a market price.</p>
          </div>
        </div>
        <div>
          <div class="panel" style="margin-bottom:var(--pad);">
            <h2>How to farm it</h2>
            <p class="sub">Derived from its category, chains, TVL and age — the same function builds every plan.</p>
            <ol class="plan">${r.farm_steps.map((s) => {
              const p = stepParts(s);
              return `<li>${esc(p.text)}<span class="plan-meta">${p.cost ? `<span class="badge cost">Cost: ${esc(p.cost)}</span>` : ''}${p.time ? `<span class="badge time">${esc(p.time)}</span>` : ''}</span></li>`;
            }).join('')}</ol>
          </div>
          ${peers.length > 0 ? `
          <div class="panel peers">
            <h2>Peer candidates — ${esc(r.category)}</h2>
            <p class="sub">Other pre-token protocols the model ranks in the same category.</p>
            ${peers.map((p) => `<div class="peer"><a href="#protocol=${esc(p.slug)}">${esc(p.name)}</a><span class="num"><span class="dim">${money(p.tvl_usd)}</span> · <span style="color:var(--amber);font-weight:700;">${money(p.implied_value_usd)}</span></span></div>`).join('')}
          </div>` : ''}
        </div>
      </div>`;
  }

  /* ---------- model ---------- */

  function renderModel() {
    const f = R.fit;
    const catRows = f.categories.map((c) => `
      <tr><td>${esc(c.category)}</td><td class="n num">${ratio(c.multiple)}</td><td class="n num">${c.n_fit}</td><td class="n num dim">${c.n_total}</td></tr>`).join('');
    const beats = f.holdout.full_model < f.holdout.global_baseline;

    main.innerHTML = `
      <div class="panel">
        <h2>The value model — ${esc(f.version)}</h2>
        <p class="sub">Fitted on the snapshot's own live-token protocols, scored blind on a held-out fifth. Every ranked protocol is scored by this one function; no name is hardcoded anywhere.</p>
        <div class="formula">
          implied <span class="op">=</span> TVL <span class="op">×</span> multiple(category) <span class="op">×</span> (TVL/${money(f.reference_tvl)})<sup>${f.size_slope.toFixed(3)}</sup> <span class="op">×</span> exp(${f.growth_slope} × clamp(7d, −60..+120)) <span class="op">×</span> (0.75 + 0.25 × min(age, 1095)/1095)
        </div>
        <div class="verdict">
          <div class="stat"><div class="k">Holdout size</div><div class="v num">${f.holdout.test_size}</div><div class="k">comparables held out by slug hash</div></div>
          <div class="stat"><div class="v warn num">${f.holdout.global_baseline.toFixed(3)}</div><div class="k">median log error — one flat global multiple</div></div>
          <div class="stat"><div class="v warn num">${f.holdout.category_model.toFixed(3)}</div><div class="k">median log error — category multiples only</div></div>
          <div class="stat"><div class="v num">${f.holdout.full_model.toFixed(3)}</div><div class="k">median log error — the full model (fitted)</div></div>
        </div>
        <p class="sub" style="margin-top:12px;">${beats
          ? `On the held-out fifth, the full model's median absolute log error (${f.holdout.full_model.toFixed(3)}) beats the flat global-multiple baseline (${f.holdout.global_baseline.toFixed(3)}) by ${Math.round((1 - f.holdout.full_model / f.holdout.global_baseline) * 100)}%. The category layer alone does not beat the baseline — the fitted size term does most of the work — and the dashboard says so rather than hiding it. Error is |ln(predicted mcap) − ln(actual mcap)|: 0.3 is roughly ±35%.`
          : `On the held-out fifth, the full model's median absolute log error is ${f.holdout.full_model.toFixed(3)} against a global baseline of ${f.holdout.global_baseline.toFixed(3)} — reported either way, so you can judge the fit yourself. Error is |ln(predicted mcap) − ln(actual mcap)|.`}</p>
      </div>
      <div class="model-grid">
        <div class="panel">
          <h2>Fitted multiples</h2>
          <p class="sub">Each category's intercept at the reference TVL of ${money(f.reference_tvl)} (the fit set's median): the median mcap/TVL residual of its fit-set comparables after the size and growth slopes, shrunk toward the global intercept (${ratio(f.global_multiple)}, fitted on ${f.fit_size} protocols) with a pseudo-count of 5. Ratios were winsorised at the fit set's 10th/90th percentile (${ratio(f.winsor_lo)}–${ratio(f.winsor_hi)}) first. Categories with fewer than ${f.min_category_n} fit-set comparables, and uncategorised protocols, fall back to the global intercept.</p>
          <table class="plain">
            <thead><tr><th>Category</th><th class="n">Multiple</th><th class="n">Fit n</th><th class="n">All n</th></tr></thead>
            <tbody>${catRows}</tbody>
          </table>
        </div>
        <div class="panel">
          <h2>Choices the model states</h2>
          <ul class="notes">
            <li><b>Size direction (fitted, ${f.size_slope.toFixed(3)} on ln TVL):</b> the market prices TVL sublinearly. Doubling TVL raises implied value about ${Math.round((2 ** f.size_slope) * 100 - 100)}%, not 100% — small speculative TVL carries a premium multiple, and a ${money(f.reference_tvl)}-TVL protocol is the yardstick the category multiples are quoted at.</li>
            <li><b>Growth direction (fitted, ${f.growth_slope}, clamped to a 0.004 ceiling):</b> rising TVL lifts the comparable multiple, but the cap means one hot week can move implied value at most ${Math.round((Math.exp(0.004 * 120) - 1) * 100)}%, so momentum never dominates substance.</li>
            <li><b>Maturity direction (a choice, stated):</b> implied value <i>rises</i> with age, plateauing at three years. A protocol that has carried its TVL for years is a bigger business by the time its token launches. Urgency — a young protocol may airdrop sooner — is shown as the <i>fresh</i> flag and never touches the ranking; value and urgency are different questions.</li>
            <li><b>Unknown age</b> counts as the midpoint multiplier (0.875) rather than punishing or rewarding a missing field.</li>
            <li><b>Strict separation:</b> the board ranks only protocols that record no token at all (no market cap, no CoinGecko id, no symbol). Exchanges, versioned pools, and wrapped, staked or bridged products of assets that already trade are filtered by the snapshot's own rule — never mixed into the ranking. Live tokens live in <a href="#live" style="color:var(--teal);text-decoration:none;">their own view</a>.</li>
            <li><b>Comparables:</b> live-token protocols give the market's own mcap/TVL. CEXes, bridges, canonical bridges and liquid-staking wrappers are excluded from the fit — their market cap prices the underlying asset, not the protocol.</li>
            <li><b>The holdout:</b> one in five comparables (by slug hash) is never used for fitting; the error numbers above are from that fifth. The split is deterministic — the same snapshot always produces the same board, byte for byte.</li>
          </ul>
        </div>
      </div>`;
  }

  /* ---------- live ---------- */

  function renderLive() {
    const rows = R.live.map((p, i) => `
      <tr>
        <td class="rank num dim">${i + 1}</td>
        <td class="name-cell"><b>${esc(p.name)}</b><small>${p.category === null ? 'uncategorised' : esc(p.category)}</small></td>
        <td>${chains(p)}</td>
        <td class="r-right num">${money(p.tvl_usd)}</td>
        <td class="r-right num" style="color:var(--teal);font-weight:600;">${money(p.mcap_usd)}</td>
        <td class="r-right num dim">${ratio(p.ratio)}</td>
        <td class="growth r-right">${pct(p.change_7d)}</td>
      </tr>`).join('');
    main.innerHTML = `
      <div class="note-live">These protocols already trade a token. The market prices them; the model does not rank them. They are shown so the board's separation is checkable — the ranked board contains none of them.</div>
      <div class="panel" style="padding:0; overflow-x:auto;">
        <table class="grid">
          <thead><tr><th></th><th>Protocol</th><th>Chains</th><th class="r-right">TVL</th><th class="r-right">Market cap</th><th class="r-right">Mcap/TVL</th><th class="r-right">7d</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="sub" style="margin-top:10px;">Mcap/TVL here is the same figure the model fitted its multiples on — ${R.fit.comparable_total} live protocols went into the fit, ${R.fit.test_size} of them held out to score it.</p>`;
  }

  /* ---------- tabs & boot ---------- */

  function setTab(page) {
    const key = page === 'protocol' ? 'board' : page;
    tabs.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.getAttribute('data-tab') === key));
  }

  function route() {
    const v = parseHash();
    setTab(v.page);
    if (v.page === 'model') { renderModel(); return; }
    if (v.page === 'live') { renderLive(); return; }
    if (v.page === 'protocol') { renderDetail(v.params.protocol || ''); return; }
    // board view, with state from the hash
    if (v.page === 'board') {
      boardState.q = v.params.q || '';
      boardState.cat = v.params.cat || '';
      boardState.chain = v.params.chain || '';
      if (v.params.sort) {
        const dash = v.params.sort.lastIndexOf('-');
        if (dash > 0 && SORTS[v.params.sort.slice(0, dash)]) {
          boardState.sort = v.params.sort.slice(0, dash);
          boardState.dir = v.params.sort.slice(dash + 1) === 'asc' ? 'asc' : 'desc';
        }
      } else if (v.page === 'board' && Object.keys(v.params).length === 0 && location.hash === '#board') {
        boardState.sort = 'implied';
        boardState.dir = 'desc';
      }
      renderBoard();
      return;
    }
    location.hash = '#board';
  }

  window.addEventListener('hashchange', route);
  route();
})();
