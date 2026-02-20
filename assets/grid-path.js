/**
 * GridPath — animated path visualizer on a 3x3 grid.
 *
 * Auto-init: include this script, then use data- attributes:
 *   <div class="grid-path" data-path="0,1,2" data-style="solid"></div>
 *
 * data- attributes:
 *   data-path      "0,3,7"         (required)
 *   data-style     "solid"|"dotted" (default: solid)
 *   data-allheads  (flag)           arrowhead every segment
 *   data-speed     "1.5"            playback speed (default: 1)
 *   data-color     "#4f56ff"        arrow/dot color
 *   data-dim-color "#c8cbda"        dimmed color
 *   data-cell-size "80"             px per cell
 *   data-border    "1px solid #aaa" outer border (default: none)
 *   data-autoplay  (flag)           auto-play on load
 *
 * JS API:
 *   var g = GridPath('#el', { path:[0,1,2], style:'solid' });
 *   g.play(); g.reset();
 */
;(function(root) {
  var NS = 'http://www.w3.org/2000/svg';
  var COLS = 3, ROWS = 3;
  var DOT_R = 7, HALO_R = DOT_R + 4, HEAD_L = 10, SQ = 8, DOT_GAP = 3;

  function GridPath(selector, cfg) {
    var container = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!container) { console.error('GridPath: not found', selector); return; }

    cfg = cfg || {};
    var path     = cfg.path || [0, 1, 2];
    var style    = cfg.style === 'dotted' ? 'dotted' : 'solid';
    var allHeads = !!cfg.allHeads;
    var spd      = cfg.speed || 1;
    var C        = cfg.cellSize || 80;
    var CLR      = cfg.color || '#4f56ff';
    var CLR_DIM  = cfg.dimColor || '#c8cbda';
    var border   = cfg.border !== undefined ? cfg.border : 'none';
    var autoplay = !!cfg.autoplay;

    var cellCenter = function(i) { return [(i % COLS) * C + C / 2, Math.floor(i / COLS) * C + C / 2]; };

    function sqExit(cx, cy, tx, ty) {
      var dx = tx - cx, dy = ty - cy, h = SQ / 2;
      if (!dx && !dy) return [cx, cy];
      var s = Math.abs(dx) > Math.abs(dy) ? h / Math.abs(dx) : h / Math.abs(dy);
      return [cx + dx * s, cy + dy * s];
    }

    function pullBack(cx, cy, fx, fy, dist) {
      var dx = cx - fx, dy = cy - fy, d = Math.hypot(dx, dy);
      if (!d) return [cx, cy];
      return [cx - dx / d * dist, cy - dy / d * dist];
    }

    function easeOut(t) { return 1 - (1 - t) * (1 - t); }

    function sEl(tag, a) {
      var e = document.createElementNS(NS, tag);
      for (var k in a) e.setAttribute(k, a[k]);
      return e;
    }

    function mkHead(x1, y1, tx, ty) {
      var a = Math.atan2(ty - y1, tx - x1), s = Math.PI / 6;
      return sEl('polyline', {
        points: [
          [tx - HEAD_L * Math.cos(a - s), ty - HEAD_L * Math.sin(a - s)],
          [tx, ty],
          [tx - HEAD_L * Math.cos(a + s), ty - HEAD_L * Math.sin(a + s)]
        ].map(function(v) { return v.join(','); }).join(' '),
        fill: 'none', stroke: CLR, 'stroke-width': 2.5,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round', visibility: 'hidden'
      });
    }

    function segGeo(i) {
      var p0 = cellCenter(path[i]), p1 = cellCenter(path[i + 1]);
      var isFinal = i === path.length - 2;
      var start = sqExit(p0[0], p0[1], p1[0], p1[1]);
      var end = isFinal ? pullBack(p1[0], p1[1], p0[0], p0[1], HALO_R + DOT_GAP) : sqExit(p1[0], p1[1], p0[0], p0[1]);
      return { x1: start[0], y1: start[1], x2: end[0], y2: end[1], len: Math.hypot(end[0] - start[0], end[1] - start[1]), isFinal: isFinal };
    }

    // DOM
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:inline-flex;flex-direction:column;align-items:flex-start;gap:0;';

    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:2px;padding:0 0 6px 0;';

    function mkBtn(html, title) {
      var b = document.createElement('button');
      b.innerHTML = html;
      b.title = title;
      b.style.cssText = 'width:26px;height:26px;display:grid;place-items:center;border:none;background:none;cursor:pointer;color:#888;font-size:14px;border-radius:4px;padding:0;transition:background .15s,color .15s;';
      b.addEventListener('mouseenter', function() { b.style.background = '#e8e9ed'; b.style.color = '#333'; });
      b.addEventListener('mouseleave', function() { b.style.background = 'none'; b.style.color = '#888'; });
      return b;
    }

    var playBtn = mkBtn('\u25B6', 'Play');
    var resetBtn = mkBtn('\u21BA', 'Reset');
    bar.appendChild(playBtn);
    bar.appendChild(resetBtn);
    wrap.appendChild(bar);

    var gridBox = document.createElement('div');
    gridBox.style.cssText = 'position:relative;width:' + (COLS * C) + 'px;height:' + (ROWS * C) + 'px;border:' + border + ';';

    for (var ci = 0; ci < 9; ci++) {
      var cell = document.createElement('div');
      var col = ci % COLS, row = Math.floor(ci / COLS);
      cell.style.cssText = 'position:absolute;background:#fff;left:' + (col * C) + 'px;top:' + (row * C) + 'px;width:' + C + 'px;height:' + C + 'px;';
      if (col < COLS - 1) cell.style.borderRight = '1px solid #d0d0d0';
      if (row < ROWS - 1) cell.style.borderBottom = '1px solid #d0d0d0';
      var idx = document.createElement('span');
      idx.textContent = ci;
      idx.style.cssText = 'position:absolute;top:3px;left:5px;font-size:9px;color:#c0c0c0;font-family:monospace;pointer-events:none;';
      cell.appendChild(idx);
      gridBox.appendChild(cell);
    }

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + (COLS * C) + ' ' + (ROWS * C));
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
    gridBox.appendChild(svg);
    wrap.appendChild(gridBox);
    container.appendChild(wrap);

    // Animation state
    var aState = 'idle';
    var rafId = null, tStart = 0, tEl = 0;
    var evts = [], anims = [], eIdx = 0;
    var lines = [], heads = [], dotBg = null, dot = null, linesG = null, headsG = null;
    var isDotted = style === 'dotted';

    function clearSvg() {
      svg.innerHTML = '';
      lines = []; heads = [];
      dotBg = null; dot = null;
      linesG = null; headsG = null;
    }

    function buildTimeline() {
      evts = []; anims = []; eIdx = 0;
      var BASE = 700 / spd, GAP = 200 / spd;
      var t = 0;

      evts.push({ t: t, type: 'e', fn: function() {
        clearSvg();
        linesG = sEl('g', {});
        headsG = sEl('g', {});
        svg.appendChild(linesG);

        for (var i = 0; i < path.length - 1; i++) {
          var g = segGeo(i);
          var hasHead = g.isFinal || allHeads;
          var line = sEl('line', {
            x1: g.x1, y1: g.y1,
            x2: isDotted ? g.x1 : g.x2,
            y2: isDotted ? g.y1 : g.y2,
            stroke: CLR, 'stroke-width': 2.5, 'stroke-linecap': 'round',
            fill: 'none', visibility: 'hidden'
          });
          if (isDotted) line.setAttribute('stroke-dasharray', '5 7');
          else { line.setAttribute('stroke-dasharray', g.len); line.setAttribute('stroke-dashoffset', g.len); }
          linesG.appendChild(line);
          lines.push(line);

          if (hasHead) {
            var hd = mkHead(g.x1, g.y1, g.x2, g.y2);
            hd._si = i;
            headsG.appendChild(hd);
            heads.push(hd);
          }
        }
      }});

      t += 300 / spd;

      evts.push({ t: t, type: 'e', fn: function() {
        var s = cellCenter(path[0]);
        dotBg = sEl('circle', { cx: s[0], cy: s[1], r: HALO_R, fill: '#fff' });
        dot = sEl('circle', { cx: s[0], cy: s[1], r: DOT_R, fill: CLR });
        svg.appendChild(dotBg);
        svg.appendChild(dot);
        svg.appendChild(headsG);
      }});

      for (var i = 0; i < path.length - 1; i++) {
        (function(i) {
          var segT = t, g = segGeo(i);
          var dur = Math.max(300 / spd, (g.len / C) * BASE);

          if (i > 0) {
            evts.push({ t: segT, type: 'e', fn: function() {
              lines[i - 1].setAttribute('stroke', CLR_DIM);
              var ph = heads.filter(function(h) { return h._si === i - 1; })[0];
              if (ph) ph.setAttribute('stroke', CLR_DIM);
            }});
          }

          evts.push({ t: segT, type: 'e', fn: function() {
            lines[i].setAttribute('visibility', 'visible');
          }});

          evts.push({ t: segT, type: 'a', dur: dur, update: function(p) {
            var ln = lines[i];
            if (!ln) return;
            if (isDotted) {
              ln.setAttribute('x2', g.x1 + (g.x2 - g.x1) * p);
              ln.setAttribute('y2', g.y1 + (g.y2 - g.y1) * p);
            } else {
              ln.setAttribute('stroke-dashoffset', g.len * (1 - p));
            }
          }});

          evts.push({ t: segT + dur * 0.7, type: 'e', fn: function() {
            var hd = heads.filter(function(h) { return h._si === i; })[0];
            if (hd) { hd.setAttribute('visibility', 'visible'); hd.setAttribute('opacity', 1); }
          }});

          var from = cellCenter(path[i]), to = cellCenter(path[i + 1]);
          var dDur = Math.min(350 / spd, dur * 0.35);
          evts.push({ t: segT + dur * 0.55, type: 'a', dur: dDur, update: function(p) {
            if (!dotBg || !dot) return;
            var cx = from[0] + (to[0] - from[0]) * p, cy = from[1] + (to[1] - from[1]) * p;
            dotBg.setAttribute('cx', cx); dotBg.setAttribute('cy', cy);
            dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
          }});

          t = segT + dur + GAP;
        })(i);
      }

      evts.sort(function(a, b) { return a.t - b.t; });
    }

    function tick() {
      if (aState !== 'playing') return;
      tEl = performance.now() - tStart;

      while (eIdx < evts.length && evts[eIdx].t <= tEl) {
        var ev = evts[eIdx];
        if (ev.type === 'e') ev.fn();
        else if (ev.type === 'a') anims.push({ s: ev.t, d: ev.dur, u: ev.update });
        eIdx++;
      }

      anims = anims.filter(function(a) {
        var p = Math.min((tEl - a.s) / a.d, 1);
        a.u(easeOut(p));
        return p < 1;
      });

      if (eIdx < evts.length || anims.length) rafId = requestAnimationFrame(tick);
      else { aState = 'idle'; updateUI(); }
    }

    function updateUI() {
      playBtn.innerHTML = aState === 'playing' ? '\u275A\u275A' : '\u25B6';
      playBtn.title = aState === 'playing' ? 'Pause' : aState === 'paused' ? 'Resume' : 'Play';
    }

    function doPlay() {
      if (aState === 'playing') {
        cancelAnimationFrame(rafId);
        aState = 'paused';
      } else if (aState === 'paused') {
        tStart = performance.now() - tEl;
        aState = 'playing';
        rafId = requestAnimationFrame(tick);
      } else {
        clearSvg();
        buildTimeline();
        tEl = 0;
        tStart = performance.now();
        aState = 'playing';
        rafId = requestAnimationFrame(tick);
      }
      updateUI();
    }

    function doReset() {
      cancelAnimationFrame(rafId);
      aState = 'idle';
      tEl = 0; eIdx = 0;
      evts = []; anims = [];
      clearSvg();
      updateUI();
    }

    playBtn.addEventListener('click', doPlay);
    resetBtn.addEventListener('click', doReset);
    if (autoplay) doPlay();

    return { play: doPlay, reset: doReset, container: wrap };
  }

  // Auto-init from data- attributes
  function autoInit() {
    var els = document.querySelectorAll('.grid-path');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el._gp) continue;
      el._gp = true;
      var raw = el.getAttribute('data-path');
      if (!raw) continue;
      GridPath(el, {
        path:     raw.split(',').map(Number),
        style:    el.getAttribute('data-style') || 'solid',
        allHeads: el.hasAttribute('data-allheads'),
        speed:    parseFloat(el.getAttribute('data-speed')) || 1,
        color:    el.getAttribute('data-color') || '#4f56ff',
        dimColor: el.getAttribute('data-dim-color') || '#c8cbda',
        cellSize: parseInt(el.getAttribute('data-cell-size')) || 80,
        border:   el.getAttribute('data-border') || 'none',
        autoplay: el.hasAttribute('data-autoplay')
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoInit);
  else autoInit();

  root.GridPath = GridPath;
})(window);
