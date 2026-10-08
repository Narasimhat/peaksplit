// Tests for the Peaksplit analysis engine. Run with: npm test
const C = require('../src/core.js');

let failures = 0;
function check(name, condition, detail) {
  if (condition) console.log('  pass  ' + name);
  else { failures++; console.log('  FAIL  ' + name + (detail ? '  — ' + detail : '')); }
}
function near(actual, expected, tol) { return Math.abs(actual - expected) <= tol; }

// A minimal ABIF writer, so the parser can be tested without committing binary files.
function writeAB1(tr) {
  const order = 'GATC', entries = [];
  const shorts = a => { const b = Buffer.alloc(a.length * 2); a.forEach((v, i) => b.writeInt16BE(v, i * 2)); return b; };
  const add = (name, num, etype, esize, buf, nel) => entries.push({ name, num, etype, esize, buf, nel });
  for (let k = 0; k < 4; k++) add('DATA', 9 + k, 4, 2, shorts(Array.from(tr.traces[order[k]])), tr.traces.A.length);
  add('FWO_', 1, 2, 1, Buffer.from(order), 4);
  add('PBAS', 2, 2, 1, Buffer.from(tr.seq), tr.seq.length);
  add('PLOC', 2, 4, 2, shorts(tr.ploc), tr.ploc.length);
  add('PCON', 2, 2, 1, Buffer.from(tr.qual), tr.qual.length);
  let off = 128; const blobs = [];
  for (const e of entries) if (e.buf.length > 4) { e.off = off; off += e.buf.length; blobs.push(e.buf); }
  const dirOff = off, dir = Buffer.alloc(entries.length * 28);
  entries.forEach((e, i) => {
    const o = i * 28;
    dir.write(e.name, o); dir.writeInt32BE(e.num, o + 4); dir.writeInt16BE(e.etype, o + 8);
    dir.writeInt16BE(e.esize, o + 10); dir.writeInt32BE(e.nel, o + 12); dir.writeInt32BE(e.buf.length, o + 16);
    if (e.buf.length <= 4) e.buf.copy(dir, o + 20); else dir.writeInt32BE(e.off, o + 20);
  });
  const head = Buffer.alloc(128);
  head.write('ABIF', 0); head.writeInt16BE(101, 4); head.write('tdir', 6); head.writeInt32BE(1, 10);
  head.writeInt16BE(1023, 14); head.writeInt16BE(28, 16); head.writeInt32BE(entries.length, 18);
  head.writeInt32BE(dir.length, 22); head.writeInt32BE(dirOff, 26);
  return Buffer.concat([head, ...blobs, dir]);
}
const roundTrip = t => {
  const b = writeAB1(t);
  return C.parseAB1(b.buffer.slice(b.byteOffset, b.byteOffset + b.length), t.name);
};

const demo = C.makeDemo();
const files = Object.fromEntries(demo.files.map(f => [f.name, f]));
const ctrlName = demo.samples[0].controlName;

console.log('\nABIF parser');
{
  const original = files[ctrlName], parsed = roundTrip(original);
  check('base calls survive a write/read round trip', parsed.seq === original.seq);
  check('peak locations survive a round trip', parsed.ploc.every((p, i) => p === original.ploc[i]));
  check('all four trace channels are recovered', ['A', 'C', 'G', 'T'].every(b => parsed.traces[b].length === original.traces[b].length));
  let threw = false;
  try { C.parseAB1(Buffer.from('not an ab1 file at all, really').buffer); } catch (e) { threw = true; }
  check('a non-ABIF file is rejected', threw);
}

console.log('\nKnockout sample (planted: 41% -1, 23% +1, 11% -8, 8% -14, 17% wild type)');
{
  const s = demo.samples[0];
  const r = C.analyzeSample({ control: files[s.controlName], edited: files[s.editedName], guide: s.guide, nuclease: s.nuclease });
  const top = r.contribs[0];
  check('model fits well (R2 > 0.9)', r.r2 > 0.9, 'R2 = ' + r.r2.toFixed(3));
  check('total indel is close to 83%', near(r.indelPct, 0.83, 0.1), (r.indelPct * 100).toFixed(1) + '%');
  check('the single-base deletion is the top allele', top.indel === -1, top.label);
  check('its share is close to 41%', near(top.weight, 0.41, 0.1), (top.weight * 100).toFixed(1) + '%');
  check('no knock-in score without a donor', r.kiScore === null);
  check('no warnings on a clean sample', r.warnings.length === 0, r.warnings.join(' / '));
}

console.log('\nKnock-in sample (planted: 31% HDR, 44% wild type)');
{
  const s = demo.samples[1];
  const r = C.analyzeSample({ control: files[s.controlName], edited: files[s.editedName], guide: s.guide, nuclease: s.nuclease, donor: s.donor });
  check('model fits well (R2 > 0.9)', r.r2 > 0.9, 'R2 = ' + r.r2.toFixed(3));
  check('two donor changes are detected', r.hdr.subs.length === 2, JSON.stringify(r.hdr.changes));
  check('knock-in score is close to 31%', near(r.kiScore, 0.31, 0.12), (r.kiScore * 100).toFixed(1) + '%');
  check('wild type is close to 44%', near(r.wtPct, 0.44, 0.12), (r.wtPct * 100).toFixed(1) + '%');
  check('every donor change is reported individually', r.donorSites.length === 2);
  check('both donor changes read as present', r.donorSites.every(d => d.edited > 0.15), JSON.stringify(r.donorSites.map(d => d.edited)));
}

console.log('\nRead orientation and reference-only mode');
{
  const s = demo.samples[0], ctrl = files[s.controlName];
  const fwd = C.analyzeSample({ control: ctrl, edited: files[s.editedName], guide: s.guide });
  const rev = C.analyzeSample({ control: ctrl, edited: C.reverseTrace(files[s.editedName]), guide: s.guide });
  check('a reverse-complemented read gives the same indel total', near(fwd.indelPct, rev.indelPct, 0.02));
  check('the flip is reported to the user', rev.warnings.some(w => /reverse-complement/i.test(w)));

  const refOnly = C.analyzeSample({ reference: ctrl.seq, edited: files[s.editedName], guide: s.guide });
  check('analysis runs from a pasted reference with no control trace', near(refOnly.indelPct, fwd.indelPct, 0.08));
  check('the missing control is flagged', refOnly.warnings.some(w => /no control trace/i.test(w)));

  // The reverse complement of a guide is a different guide: its PAM would have to sit on the other
  // side, and there is none there. The tool should locate it but warn rather than fail silently.
  const flipped = C.analyzeSample({ control: ctrl, edited: files[s.editedName], guide: C.revcomp(s.guide) });
  check('a guide entered in the wrong orientation triggers a PAM warning', flipped.warnings.some(w => /PAM/.test(w)), flipped.warnings.join(' / '));
}

console.log('\nError handling');
{
  const s = demo.samples[0], ctrl = files[s.controlName], ed = files[s.editedName];
  const fails = (label, args, pattern) => {
    let message = null;
    try { C.analyzeSample(args); } catch (e) { message = e.message; }
    check(label, message !== null && pattern.test(message), message || 'no error was raised');
  };
  fails('a guide that is not present is reported', { control: ctrl, edited: ed, guide: 'ACGTACGTACGTACGTACGT' }, /not found/i);
  fails('a guide that is too short is reported', { control: ctrl, edited: ed, guide: 'ACGTACGT' }, /at least 15/i);
  fails('a missing edited trace is reported', { control: ctrl, guide: s.guide }, /edited trace/i);
  fails('a missing control and reference is reported', { edited: ed, guide: s.guide }, /control trace|reference/i);
  fails('a donor that does not align is reported', { control: ctrl, edited: ed, guide: s.guide, donor: 'ACGT'.repeat(20) }, /does not align/i);
}

console.log('\nDonor concordance');
{
  // A donor whose changes are not in the edited read should read as absent, not as knock-in.
  const s = demo.samples[0], ctrl = files[s.controlName];
  const ref = ctrl.seq.split('');
  const g = C.findGuide(ctrl.seq, s.guide, 'SpCas9');
  const swap = b => ({ A: 'G', G: 'A', C: 'T', T: 'C' }[b]);
  ref[g.cut + 5] = swap(ref[g.cut + 5]);
  const donor = ref.join('').slice(g.cut - 40, g.cut + 41);
  const r = C.analyzeSample({ control: ctrl, edited: files[s.editedName], guide: s.guide, donor });
  check('an unconverted donor change reads near zero', r.donorSites[0].edited < 0.2, (r.donorSites[0].edited * 100).toFixed(1) + '%');
  check('knock-in score stays low', r.kiScore < 0.15, (r.kiScore * 100).toFixed(1) + '%');
}

console.log(failures === 0 ? '\nAll checks passed.\n' : '\n' + failures + ' check(s) failed.\n');
process.exit(failures === 0 ? 0 : 1);
