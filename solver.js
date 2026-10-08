// Pure function: no DOM and no app globals. index.html runs it in a Web Worker
// (built from solve.toString()), falls back to calling it directly, and it also
// loads under Node for testing.
function solve(input) {
  var N = 6, H = 5, EPS = 1e-4;
  var stats = input.stats, stickers = input.stickers, sheet = input.sheet;
  var requireAll = !!input.requireAll;
  var maxNodes = input.maxNodes || 20000000, maxSolutions = input.maxSolutions || 300;
  var S = stats.length, idx = {};
  stats.forEach(function (s, i) { idx[s.name] = i; });
  var avail = 0;
  for (var i = 0; i < N * H; i++) if (sheet[i]) avail |= 1 << i;

  function popcount(v) { var c = 0; while (v) { v &= v - 1; c++; } return c; }

  // Glow Up reach: rarity 1 = horizontal, 2 = + vertical, 3 = + diagonal
  function lampRange(cells, ownMask, rarity) {
    var range = 0;
    cells.forEach(function (c) {
      var x = c % N, y = (c - x) / N;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        var diag = dx !== 0 && dy !== 0;
        var ok = dy === 0 || (dx === 0 && rarity >= 2) || (diag && rarity === 3);
        if (!ok) continue;
        var nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= H) continue;
        range |= 1 << (ny * N + nx);
      }
    });
    return range & ~ownMask;
  }

  function buildInfo(si) {
    var d = stickers[si];
    var inf = { si: si, pls: [], size: d.cells.length, baseVec: null, commonIdx: -1, commonVal: 0, cands: null, achiral: false };
    var orients = [], seen = {};
    var cur = d.cells.map(function (c) { return [c[0], c[1]]; });
    for (var r = 0; r < 4; r++) {
      var minX = Math.min.apply(null, cur.map(function (c) { return c[0]; }));
      var minY = Math.min.apply(null, cur.map(function (c) { return c[1]; }));
      var norm = cur.map(function (c) { return [c[0] - minX, c[1] - minY]; })
                    .sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
      var key = norm.join(';');
      if (!seen[key]) { seen[key] = 1; orients.push(norm); }
      cur = cur.map(function (c) { return [-c[1], c[0]]; });
    }
    // Mirror-closed (achiral) check: the mirrored shape is one of its own rotations.
    var mc = d.cells.map(function (c) { return [-c[0], c[1]]; });
    var mx = Math.min.apply(null, mc.map(function (c) { return c[0]; }));
    var my = Math.min.apply(null, mc.map(function (c) { return c[1]; }));
    inf.achiral = !!seen[mc.map(function (c) { return [c[0] - mx, c[1] - my]; })
      .sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; }).join(';')];
    orients.forEach(function (o) {
      var w = Math.max.apply(null, o.map(function (c) { return c[0]; })) + 1;
      var h = Math.max.apply(null, o.map(function (c) { return c[1]; })) + 1;
      for (var oy = 0; oy + h <= H; oy++) for (var ox = 0; ox + w <= N; ox++) {
        var mask = 0, cells = [];
        o.forEach(function (c) { var bi = (c[1] + oy) * N + (c[0] + ox); cells.push(bi); mask |= 1 << bi; });
        if ((mask & avail) !== mask) continue;
        inf.pls.push({ mask: mask, cells: cells, range: d.isLamp ? lampRange(cells, mask, d.rarity) : 0 });
      }
    });
    if (!d.isLamp) {
      inf.baseVec = new Float64Array(S);
      for (var e = 0; e < d.effects.length && e < d.rarity; e++) {
        var ef = d.effects[e], s = idx[ef.stat];
        if (s === undefined) continue;
        if (stats[s].numerical) {
          inf.baseVec[s] += ef.value;
          if (e === 0) { inf.commonIdx = s; inf.commonVal = ef.value; }
        } else inf.baseVec[s] += 1;
      }
    }
    return inf;
  }

  // Give stickers with the same gameplay definition a shared signature.
  // Their generated names/counters are intentionally excluded, so identical
  // copies can be treated as interchangeable by the search.
  function stickerSignature(si) {
    var d = stickers[si];
    var cells = d.cells.map(function (c) { return [c[0], c[1]]; })
      .sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
    var effects = (d.effects || []).map(function (e) {
      return { stat: e.stat, value: e.value };
    });
    return JSON.stringify({
      cells: cells,
      rarity: d.rarity,
      isLamp: !!d.isLamp,
      effects: effects,
      lampBoost: d.isLamp ? d.lampBoost : 0
    });
  }

  var infos = {}, sigBySi = {}, firstSeen = {}, sigCount = {}, nSeen = 0;
  input.instances.forEach(function (si) {
    firstSeen[si] = nSeen++;
    var sig = stickerSignature(si);
    sigBySi[si] = sig;
    sigCount[sig] = (sigCount[sig] || 0) + 1;
    if (!infos[sig]) infos[sig] = buildInfo(si);
  });

  // ---- board symmetry: apply it only through a sticker with no duplicate ----
  // A duplicate group has no distinguished member, so "first placed" symmetry
  // pruning can accidentally remove valid layouts after the copies are reordered.
  // Anchor symmetry to one selected sticker whose signature occurs exactly once.
  var symmetryAnchor = -1;
  input.instances.forEach(function (si) {
    if (symmetryAnchor < 0 && sigCount[sigBySi[si]] === 1) symmetryAnchor = si;
  });

  // rot180 always; flips only if every selected shape is mirror-closed.
  var allAchiral = Object.keys(infos).every(function (k) { return infos[k].achiral; });
  function mapMask(m, fx, fy) {
    var r = 0;
    for (var c = 0; c < N * H; c++) if (m & (1 << c)) {
      var x = c % N, y = (c - x) / N;
      r |= 1 << ((fy ? H - 1 - y : y) * N + (fx ? N - 1 - x : x));
    }
    return r;
  }
  var syms = [];
  if (symmetryAnchor >= 0) {
    [[1, 1], [1, 0], [0, 1]].forEach(function (t) {
      if (!(t[0] && t[1]) && !allAchiral) return;
      if (mapMask(avail, t[0], t[1]) === avail) syms.push(t);
    });
  }
  function canon(mask) {
    for (var s = 0; s < syms.length; s++) if (mapMask(mask, syms[s][0], syms[s][1]) < mask) return false;
    return true;
  }

  var nPlaced = 0;

  var lampList = input.instances.filter(function (si) { return stickers[si].isLamp; })
    .sort(function (a, b) { return firstSeen[a] - firstSeen[b]; });
  var otherList = input.instances.filter(function (si) { return !stickers[si].isLamp; })
    .sort(function (a, b) { return stickers[b].cells.length - stickers[a].cells.length || firstSeen[a] - firstSeen[b]; });

  function prevSame(list) {
    var last = {};
    return list.map(function (si, i) {
      var key = sigBySi[si];
      var p = last[key] === undefined ? -1 : last[key];
      last[key] = i;
      return p;
    });
  }
  var lampInfo = lampList.map(function (si) { return infos[sigBySi[si]]; });
  var otherInfo = otherList.map(function (si) { return infos[sigBySi[si]]; });
  var lampPrev = prevSame(lampList), otherPrev = prevSame(otherList);
  var distinctOthers = [];
  otherInfo.forEach(function (inf) { if (distinctOthers.indexOf(inf) < 0) distinctOthers.push(inf); });

  var L = lampInfo.length, O = otherInfo.length;
  var lampChosen = new Array(L).fill(null), lampChosenIdx = new Array(L).fill(-1), lampEff = new Array(L).fill(0);
  var otherChosen = new Array(O).fill(null), otherChosenIdx = new Array(O).fill(-1);
  var stack = [];
  for (var q = 0; q <= O; q++) stack.push(new Float64Array(S));
  var upperBound = new Float64Array(S);
  var suffixSize = new Array(O + 1).fill(0);
  for (var q2 = O - 1; q2 >= 0; q2--) suffixSize[q2] = suffixSize[q2 + 1] + otherInfo[q2].size;

  var sols = [], nodes = 0, stop = false, truncated = false;
  function halt() { if (stop) return true; if (++nodes > maxNodes) { stop = true; truncated = true; return true; } return false; }

  // Recompute the best possible finish against the cells that are still free.
  // Each remaining sticker contributes its base stats plus the best Glow Up
  // factor from a placement that does not overlap occ. If no placement remains,
  // the sticker contributes nothing unless requireAll makes the branch impossible.
  function dominated(cur, i, occ) {
    for (var k = 0; k < S; k++) upperBound[k] = cur[k];

    for (var j = i; j < O; j++) {
      var inf = otherInfo[j], cands = inf.cands, best = null;
      for (var c = 0; c < cands.length; c++) {
        if (!(cands[c].pl.mask & occ)) { best = cands[c]; break; }
      }

      if (!best) {
        if (requireAll) return true;
        continue;
      }

      for (var k2 = 0; k2 < S; k2++) if (stats[k2].optimize !== false) upperBound[k2] += inf.baseVec[k2];
      if (inf.commonIdx >= 0 && stats[inf.commonIdx].optimize !== false) {
        upperBound[inf.commonIdx] += inf.commonVal * best.factor;
      }
    }

    for (var a = 0; a < sols.length; a++) {
      var m = sols[a].vec, ge = true;
      for (var k3 = 0; k3 < S; k3++) {
        if (stats[k3].optimize === false) continue;
        if (m[k3] < upperBound[k3] - EPS) { ge = false; break; }
      }
      if (ge) return true;
    }
    return false;
  }

  function build(v) {
    var s = { placed: [], totals: {}, commonTotals: {}, descriptive: {}, vec: Array.prototype.slice.call(v) };
    lampInfo.forEach(function (inf, i) {
      if (lampChosen[i]) s.placed.push({ sticker: lampList[i], cells: lampChosen[i].cells.slice(), lampBoost: lampEff[i], multiplier: 1, commonValue: 0 });
    });
    otherInfo.forEach(function (inf, i) {
      var c = otherChosen[i]; if (!c) return;
      var mult = 1 + c.factor;
      var p = { sticker: otherList[i], cells: c.pl.cells.slice(), multiplier: mult, commonValue: inf.commonVal * mult, lampBoost: 0 };
      s.placed.push(p);
      if (inf.commonIdx >= 0) { var n = stats[inf.commonIdx].name; s.commonTotals[n] = (s.commonTotals[n] || 0) + p.commonValue; }
    });
    for (var k = 0; k < S; k++) {
      if (v[k] <= EPS) continue;
      if (stats[k].numerical) s.totals[stats[k].name] = v[k]; else s.descriptive[stats[k].name] = Math.round(v[k]);
    }
    var vals = Object.keys(s.commonTotals).map(function (n) { return s.commonTotals[n]; });
    s.balance = vals.reduce(function (a, b) { return a + b; }, 0);
    s.highestStat = vals.length ? Math.max.apply(null, vals) : 0;
    s.raritySum = s.placed.reduce(function (a, p) { return a + stickers[p.sticker].rarity; }, 0);
    s.epicCount = s.placed.reduce(function (a, p) { return a + (stickers[p.sticker].rarity === 3 ? 1 : 0); }, 0);
    s.rareCount = s.placed.reduce(function (a, p) { return a + (stickers[p.sticker].rarity === 2 ? 1 : 0); }, 0);
    s.commonCount = s.placed.reduce(function (a, p) { return a + (stickers[p.sticker].rarity === 1 ? 1 : 0); }, 0);
    return s;
  }

  // Keep the Pareto frontier only over stats that are actual optimization
  // objectives. Stacked rare/epic effects are display values, not separate
  // objectives; including them here can explode the frontier and cause the
  // maxSolutions cap to stop the search before the common stats are optimized.
  function record(v) {
    for (var a = sols.length - 1; a >= 0; a--) {
      var m = sols[a].vec, vGeM = true, mGeV = true;
      for (var k = 0; k < S; k++) {
        if (stats[k].optimize === false) continue;
        if (v[k] < m[k] - EPS) vGeM = false;
        if (m[k] < v[k] - EPS) mGeV = false;
      }
      if (vGeM) sols.splice(a, 1);
      else if (mGeV) return;
    }
    sols.push(build(v));
    if (sols.length >= maxSolutions) { truncated = true; stop = true; }
  }

  function dfs2(i, occ, cur) {
    if (halt()) return;
    if (dominated(cur, i, occ)) return;
    if (i === O) { record(cur); return; }
    if (requireAll && popcount(avail & ~occ) < suffixSize[i]) return;
    var inf = otherInfo[i], prev = otherPrev[i], start = 0, mustSkip = false;
    if (prev >= 0) { if (otherChosen[prev] === null) mustSkip = true; else start = otherChosenIdx[prev] + 1; }
    if (!mustSkip) {
      var cands = inf.cands;
      for (var k = start; k < cands.length; k++) {
        var c = cands[k];
        if (c.pl.mask & occ) continue;
        if (otherList[i] === symmetryAnchor && !canon(c.pl.mask)) continue;
        var next = stack[i + 1];
        for (var q = 0; q < S; q++) next[q] = cur[q] + inf.baseVec[q];
        if (inf.commonIdx >= 0) next[inf.commonIdx] += inf.commonVal * c.factor;
        otherChosen[i] = c; otherChosenIdx[i] = k;
        nPlaced++;
        dfs2(i + 1, occ | c.pl.mask, next);
        nPlaced--;
        if (stop) { otherChosen[i] = null; return; }
      }
    }
    if (!requireAll) { otherChosen[i] = null; otherChosenIdx[i] = -1; dfs2(i + 1, occ, cur); }
    otherChosen[i] = null;
  }

  function stage2(occ) {
    nodes += 20;
    var placed = [];
    for (var i = 0; i < L; i++) if (lampChosen[i]) placed.push(i);
    var m = placed.length;

    // A Glow Up contributes its boost to another Glow Up at most once, even if
    // their 1x2 shapes touch along multiple cells.
    for (var a = 0; a < m; a++) {
      var ia = placed[a], e = stickers[lampInfo[ia].si].lampBoost;
      for (var b = 0; b < m; b++) {
        if (a === b) continue;
        var ib = placed[b];
        if (lampChosen[ia].mask & lampChosen[ib].range) {
          e += stickers[lampInfo[ib].si].lampBoost;
        }
      }
      lampEff[ia] = e;
    }

    distinctOthers.forEach(function (inf) {
      var list = [];
      inf.pls.forEach(function (pl) {
        if (pl.mask & occ) return;

        // Evaluate each placed Glow Up exactly once. The bitmask intersection
        // means touching two cells of the same Glow Up still gives one boost.
        var f = 0;
        for (var a2 = 0; a2 < m; a2++) {
          var li = placed[a2];
          if (pl.mask & lampChosen[li].range) f += lampEff[li] / 100;
        }
        list.push({ pl: pl, factor: f, ord: list.length });
      });
      list.sort(function (x, y) { return y.factor - x.factor || x.ord - y.ord; });
      inf.cands = list;
    });
    stack[0].fill(0);
    dfs2(0, occ, stack[0]);
  }

  // Glow Ups are always placed first (before any other sticker), and the
  // "place it" branches are explored before the "skip it" branch.
  function lampDfs(i, occ) {
    if (halt()) return;
    if (i === L) { stage2(occ); return; }
    var inf = lampInfo[i], prev = lampPrev[i], start = 0, mustSkip = false;
    if (prev >= 0) { if (lampChosen[prev] === null) mustSkip = true; else start = lampChosenIdx[prev] + 1; }
    if (!mustSkip) {
      for (var k = start; k < inf.pls.length; k++) {
        var pl = inf.pls[k];
        if (pl.mask & occ) continue;
        if (lampList[i] === symmetryAnchor && !canon(pl.mask)) continue;
        lampChosen[i] = pl; lampChosenIdx[i] = k;
        nPlaced++;
        lampDfs(i + 1, occ | pl.mask);
        nPlaced--;
        if (stop) { lampChosen[i] = null; return; }
      }
    }
    if (!requireAll) { lampChosen[i] = null; lampChosenIdx[i] = -1; lampDfs(i + 1, occ); }
    lampChosen[i] = null;
  }

  lampDfs(0, 0);
  return { solutions: sols, truncated: truncated, nodes: nodes };
}

if (typeof module !== 'undefined') module.exports = solve;