#!/usr/bin/env node
/**
 * Petite Lavande — Cricut gift-card writer
 * ----------------------------------------
 * Pulls pending orders (Supabase / CSV / demo), renders each gift message
 * in a single-line script font (pen-friendly), lays cards out on a
 * 12x12 in Cricut mat, and writes one SVG per mat batch.
 *
 * Usage:
 *   node generate-cards.js --demo               # sample data, no DB needed
 *   node generate-cards.js --csv orders.csv     # columns: id,recipient,message
 *   node generate-cards.js                      # query Supabase (env vars below)
 *   node generate-cards.js --mark               # ...and set card_generated=true after
 *
 * Env (Supabase mode):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   Optional overrides: ORDERS_TABLE, COL_ID, COL_RECIPIENT, COL_MESSAGE, COL_FLAG
 */

const fs = require('fs');
const path = require('path');
const hershey = require('hersheytext');

// ---------------------------------------------------------------- config ----
const CFG = {
  // Supabase schema (override with env vars if your columns differ)
  table: process.env.ORDERS_TABLE || 'orders',
  colId: process.env.COL_ID || 'id',
  colRecipient: process.env.COL_RECIPIENT || 'recipient_name',
  colMessage: process.env.COL_MESSAGE || 'gift_message',
  colFlag: process.env.COL_FLAG || 'card_generated',

  // Font: single-line script. Alternatives: 'hershey_script_med', 'scriptc'
  font: process.env.CARD_FONT || 'ems_allure',

  // Card geometry (mm) — cream laser-cut lace card 11.7 x 7.5 cm
  cardW: 117,
  cardH: 75,
  padX: 14,          // text box side padding
  padTop: 12,
  padBottom: 12,

  // Type
  emMm: 8,           // starting em size in mm (auto-shrinks to fit)
  emMinMm: 4.5,
  lineHeight: 1.25,  // x em
  greeting: true,    // prepend "Dear {recipient}," when recipient present

  // Mat: 12 x 12 in
  matMm: 304.8,
  cols: 2,
  rows: 3,

  strokeMm: 0.35,    // preview stroke width; pen width is set on the machine
  outDir: path.join(__dirname, 'out'),
};

// ------------------------------------------------------------- font prep ----
const fontData = hershey.getFontData(CFG.font);
const isSvgFont = fontData.type === 'svg';
const UPM = isSvgFont ? parseFloat(fontData.info['units-per-em']) : 22; // hershey glyphs ~22 units tall
const SPACE_ADV = parseFloat(fontData.info['horiz-adv-x']) || (isSvgFont ? UPM * 0.35 : 10);
const HERSHEY_MULT = 1.68; // advance multiplier hersheytext uses for classic hershey fonts

function glyphFor(ch) {
  let g = fontData.getChar(ch);
  if (g && g.d) return { g, ch };
  // fallback: strip diacritics (é -> e) so French accents degrade gracefully
  const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (base !== ch) {
    g = fontData.getChar(base);
    if (g && g.d) return { g, ch: base, degraded: true };
  }
  return null;
}

function advanceOf(g) {
  return isSvgFont ? g.width : g.width * HERSHEY_MULT;
}

// measure a word in font units
function wordWidth(word) {
  let w = 0;
  for (const ch of word) {
    const hit = glyphFor(ch);
    if (hit) w += advanceOf(hit.g);
  }
  return w;
}

function hasUnrenderable(text) {
  for (const ch of text) {
    if (ch === ' ' || ch === '\n') continue;
    if (!glyphFor(ch)) return ch;
  }
  return null;
}

// greedy word-wrap into lines that fit maxUnits
function wrap(text, maxUnits) {
  const lines = [];
  for (const rawLine of text.split(/\n/)) {
    const words = rawLine.trim().split(/\s+/).filter(Boolean);
    if (!words.length) { lines.push(''); continue; }
    let cur = '', curW = 0;
    for (const word of words) {
      const wW = wordWidth(word);
      const addW = curW === 0 ? wW : curW + SPACE_ADV + wW;
      if (curW > 0 && addW > maxUnits) {
        lines.push(cur);
        cur = word; curW = wW;
      } else {
        cur = curW === 0 ? word : cur + ' ' + word;
        curW = addW;
      }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

function lineWidthUnits(line) {
  let w = 0, first = true;
  for (const word of line.split(' ')) {
    if (!first) w += SPACE_ADV;
    w += wordWidth(word);
    first = false;
  }
  return w;
}

// render one line -> array of <path> strings, positioned in mm, centered at cx
function renderLine(line, cx, baselineY, scale) {
  const paths = [];
  const totalW = lineWidthUnits(line) * scale;
  let x = cx - totalW / 2;
  for (const ch of line) {
    if (ch === ' ') { x += SPACE_ADV * scale; continue; }
    const hit = glyphFor(ch);
    if (!hit) continue;
    const { g } = hit;
    let transform;
    if (isSvgFont) {
      // svg fonts: y-up around baseline -> flip; baseline lands on baselineY
      transform = `translate(${x.toFixed(3)} ${baselineY.toFixed(3)}) scale(${scale.toFixed(5)} ${-scale.toFixed(5)})`;
    } else {
      // hershey: y-down, baseline at ~21 units below top
      transform = `translate(${x.toFixed(3)} ${(baselineY - 21 * scale).toFixed(3)}) scale(${scale.toFixed(5)})`;
    }
    paths.push(`<path d="${g.d}" transform="${transform}"/>`);
    x += advanceOf(g) * scale;
  }
  return paths;
}

// layout a message inside one card placed at (ox, oy) mm
function renderCard(order, ox, oy) {
  let text = (order.message || '').trim();
  if (CFG.greeting && order.recipient) {
    text = `Dear ${order.recipient},\n` + text;
  }
  const boxW = CFG.cardW - 2 * CFG.padX;
  const boxH = CFG.cardH - CFG.padTop - CFG.padBottom;

  // shrink em size until the block fits both dimensions
  let emMm = CFG.emMm, lines, scale;
  for (;;) {
    scale = emMm / UPM;
    lines = wrap(text, boxW / scale);
    const widest = Math.max(...lines.map(lineWidthUnits)) * scale;
    const blockH = lines.length * emMm * CFG.lineHeight;
    if ((widest <= boxW + 0.01 && blockH <= boxH) || emMm <= CFG.emMinMm) break;
    emMm -= 0.25;
  }

  const lineStep = emMm * CFG.lineHeight;
  const blockH = lines.length * lineStep;
  const cx = ox + CFG.cardW / 2;
  // center block vertically; baseline of first line ~0.72em below its top
  let baselineY = oy + CFG.padTop + Math.max(0, (boxH - blockH) / 2) + emMm * 0.72;

  const paths = [];
  for (const line of lines) {
    if (line) paths.push(...renderLine(line, cx, baselineY, scale));
    baselineY += lineStep;
  }
  return { paths, emMm, lineCount: lines.length };
}

// ------------------------------------------------------------- mat batch ----
function buildMatSVG(orders, matIndex) {
  const { matMm, cardW, cardH, cols, rows } = CFG;
  const gapX = (matMm - cols * cardW) / (cols + 1);
  const gapY = (matMm - rows * cardH) / (rows + 1);

  const guides = [];
  const textGroups = [];
  const manifest = [];

  orders.forEach((order, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const ox = gapX + c * (cardW + gapX);
    const oy = gapY + r * (cardH + gapY);
    guides.push(
      `<rect x="${ox.toFixed(2)}" y="${oy.toFixed(2)}" width="${cardW}" height="${cardH}" rx="3"/>`
    );
    const { paths, emMm, lineCount } = renderCard(order, ox, oy);
    textGroups.push(`<g id="order-${order.id}">${paths.join('')}</g>`);
    manifest.push({
      mat: matIndex + 1,
      slot: i + 1,
      row: r + 1,
      col: c + 1,
      xMm: +ox.toFixed(1),
      yMm: +oy.toFixed(1),
      id: order.id,
      recipient: order.recipient || '',
      emMm: +emMm.toFixed(2),
      lines: lineCount,
    });
  });

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="12in" height="12in" viewBox="0 0 ${CFG.matMm} ${CFG.matMm}">
  <!-- GUIDES layer: card outlines for alignment only.
       In Design Space set this layer to "Guide"/delete it, or set to Basic Cut
       if you want the machine to cut the cards too. -->
  <g id="guides" fill="none" stroke="#bbbbbb" stroke-width="0.2">${guides.join('')}</g>
  <!-- WRITE layer: set Operation = Pen / Draw in Design Space -->
  <g id="write" fill="none" stroke="#41342A" stroke-width="${CFG.strokeMm}" stroke-linecap="round" stroke-linejoin="round">
    ${textGroups.join('\n    ')}
  </g>
</svg>`;
  return { svg, manifest };
}

// ------------------------------------------------------------ data sources --
function demoOrders() {
  return [
    { id: 'demo-1', recipient: 'Anna', message: 'Wishing you gentle days and sweet dreams as you welcome little Chloe. With all our love from the whole marketing team!' },
    { id: 'demo-2', recipient: 'Sophie', message: 'Felicitations! May these first weeks be full of softness, rest, and tiny miracles.' },
    { id: 'demo-3', recipient: '', message: 'Welcome to the world, little one. You are so loved already.' },
    { id: 'demo-4', recipient: 'Mei', message: 'Congratulations on your beautiful baby boy! Sending warm hugs and lavender-scented calm your way. Rest well, mama.' },
  ];
}

function parseCSV(file) {
  const rows = [];
  const textRaw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  let i = 0, field = '', row = [], inQ = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { if (row.length) rows.push(row); row = []; };
  while (i < textRaw.length) {
    const ch = textRaw[i];
    if (inQ) {
      if (ch === '"') {
        if (textRaw[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') pushField();
    else if (ch === '\n') { pushField(); pushRow(); }
    else field += ch;
    i++;
  }
  if (field || row.length) { pushField(); pushRow(); }
  const [header, ...data] = rows;
  const idx = (name) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const iId = idx('id'), iRec = idx('recipient'), iMsg = idx('message');
  return data
    .filter((r) => r.length && r.some((c) => c.trim()))
    .map((r, n) => ({
      id: iId >= 0 ? r[iId] : `row-${n + 1}`,
      recipient: iRec >= 0 ? r[iRec] : '',
      message: iMsg >= 0 ? r[iMsg] : '',
    }));
}

async function supabaseOrders() {
  const { createClient } = require('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or use --demo / --csv).');
    process.exit(1);
  }
  const sb = createClient(url, key);
  const { data, error } = await sb
    .from(CFG.table)
    .select(`${CFG.colId}, ${CFG.colRecipient}, ${CFG.colMessage}`)
    .or(`${CFG.colFlag}.is.null,${CFG.colFlag}.eq.false`)
    .not(CFG.colMessage, 'is', null);
  if (error) { console.error('Supabase error:', error.message); process.exit(1); }
  return data
    .filter((r) => (r[CFG.colMessage] || '').trim())
    .map((r) => ({ id: r[CFG.colId], recipient: r[CFG.colRecipient] || '', message: r[CFG.colMessage] }));
}

async function markGenerated(ids) {
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await sb.from(CFG.table).update({ [CFG.colFlag]: true }).in(CFG.colId, ids);
  if (error) console.error('Failed to mark orders:', error.message);
  else console.log(`Marked ${ids.length} orders as generated.`);
}

// ------------------------------------------------------------------ main ----
async function main() {
  const args = process.argv.slice(2);
  const csvIdx = args.indexOf('--csv');

  let orders;
  if (args.includes('--demo')) orders = demoOrders();
  else if (csvIdx >= 0) orders = parseCSV(args[csvIdx + 1]);
  else orders = await supabaseOrders();

  if (!orders.length) { console.log('No pending cards. ✔'); return; }

  // split out messages this font can't write (e.g. Chinese) -> handwrite list
  const writable = [], handwrite = [];
  for (const o of orders) {
    const full = (CFG.greeting && o.recipient ? `Dear ${o.recipient}, ` : '') + o.message;
    const bad = hasUnrenderable(full);
    if (bad && /[⺀-鿿぀-ヿ가-힯]/.test(full)) handwrite.push({ ...o, reason: `CJK text ("${bad}")` });
    else writable.push(o);
  }

  fs.mkdirSync(CFG.outDir, { recursive: true });
  const perMat = CFG.cols * CFG.rows;
  const stamp = new Date().toISOString().slice(0, 10);
  const allManifest = [];
  const files = [];

  for (let m = 0; m * perMat < writable.length; m++) {
    const batch = writable.slice(m * perMat, (m + 1) * perMat);
    const { svg, manifest } = buildMatSVG(batch, m);
    const file = path.join(CFG.outDir, `cards-${stamp}-mat${m + 1}.svg`);
    fs.writeFileSync(file, svg);
    files.push(file);
    allManifest.push(...manifest);
  }

  // console manifest — which card goes in which slot
  console.log(`\nFont: ${CFG.font} | ${writable.length} cards -> ${files.length} mat file(s)\n`);
  for (const row of allManifest) {
    console.log(
      `mat ${row.mat}  slot ${row.slot} (r${row.row}c${row.col} @ ${row.xMm},${row.yMm}mm)  ` +
      `#${row.id}  ${row.recipient ? 'Dear ' + row.recipient : '(no name)'}  [${row.lines} lines @ ${row.emMm}mm]`
    );
  }
  for (const f of files) console.log('->', f);

  if (handwrite.length) {
    console.log(`\n⚠  ${handwrite.length} order(s) need handwriting (font can't render):`);
    for (const o of handwrite) console.log(`  #${o.id} — ${o.reason}`);
  }

  if (args.includes('--mark') && !args.includes('--demo') && csvIdx < 0) {
    await markGenerated(writable.map((o) => o.id));
  }
}

if (require.main === module) main();

// Reused by the portal Cards page (preview + mat downloads) — same geometry,
// same font, one source of truth.
module.exports = { CFG, renderCard, buildMatSVG, hasUnrenderable };
