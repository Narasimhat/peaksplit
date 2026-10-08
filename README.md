# Peaksplit

Works out which alleles a CRISPR experiment produced, from a pair of Sanger chromatograms. Give it an unedited control trace and an edited trace, plus the guide sequence, and it splits the mixed peaks into the deletions, insertions and donor-templated changes that make them up. Same job as ICE and DECODR, with per-allele output you can read against the raw trace.

Everything runs in the browser. Traces are read with the File API and never leave the machine, so there is no server to run and nothing to configure for data handling.

## What it reports

**For knockouts** — total indel percentage, a knockout score (the share of alleles that are frameshifted or carry an indel of 21 bp or more), the distribution of indel sizes, and each inferred allele aligned against the control around the cut.

**For knock-ins** — a knock-in score, plus a table giving each designed donor change on its own with the fraction of signal that converted. That table matters: the knock-in score only counts alleles carrying every change, so a single blocking mutation that never converted will drag the score to roughly half while the table shows exactly which change is missing.

**For both** — annotated chromatograms with the guide, PAM and cut site marked and every departure from the control labelled; a discordance plot; a per-base composition table across the guide, which also works for base editing; CSV export; and warnings when the fit is poor, the donor conflicts with the read, or the trace quality runs out.

Alleles carrying donor changes *and* an indel at the cut are modelled explicitly. These are common in HDR experiments and are counted as indels rather than knock-in, since the allele is usually frameshifted.

## Running it

No build step and no dependencies. Clone and open `index.html`, or serve the folder:

```bash
git clone https://github.com/YOUR-USERNAME/peaksplit.git
cd peaksplit
npx serve .
```

`npm test` runs the engine against synthetic traces with known allele mixtures. `npm run build` inlines everything into `dist/peaksplit.html`, a single portable file that works offline and can be emailed.

## Deploying to Vercel

Import the repository at [vercel.com/new](https://vercel.com/new). It is a static site, so leave the framework preset as **Other** and leave the build and output settings empty. `vercel.json` sets the security headers.

From the command line instead:

```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production
```

## Using it

1. Drop your `.ab1` files in, controls and edited reads together. Files with `control`, `ctrl`, `WT`, `mock` or `parental` in the name are paired as controls automatically.
2. Enter the guide, 5′→3′ without the PAM, and pick the nuclease. "Apply to all" fills every sample at once.
3. For knock-ins, paste the ssODN or expected HDR sequence. Either strand works. There is a matching "apply to all" for donors.
4. Analyze, then click a row for the full per-sample view.

A CSV sample sheet can be imported instead, with columns for label, control file, edited file, guide, donor and nuclease.

## How the analysis works

The edited read is aligned to the control with Smith–Waterman over a 40 bp window upstream of the cut, which fixes the offset between the two reads and detects a read sequenced from the opposite end. Peak heights at each called base are turned into four base fractions.

Candidate alleles are then built: wild type, every deletion up to the configured maximum anchored across a range of start positions, insertions of each length, the donor allele when one is supplied, and the donor allele combined with each indel. Every candidate is expressed as the base fractions it would produce, taken from the control's own peaks rather than an idealised square wave, so sequence-dependent peak-height bias cancels out.

The observed fractions after the cut are fitted as a non-negative combination of those candidates by non-negative least squares (Lawson–Hanson over the Gram matrix, with a Cholesky solve on the passive set). The coefficients, normalised, are the reported allele shares. R² reports how much of the observed signal the model accounts for.

## Limitations

One guide per sample; multiplexed and paired-guide deletions are not supported. Deletions larger than the configured maximum, which defaults to 30 bp, will not be fitted, and a warning fires when a large share of the signal sits at the limit. Sanger cannot see an allele that has lost a primer site, so an apparent homozygote may be a heterozygote with a large deletion on the other allele; confirm clones with long-range PCR or copy-number assay. Results with R² below 0.8 should not be trusted, and anything you intend to publish or bank should be confirmed by NGS.

## Layout

```
index.html        markup
src/core.js       ABIF parser, alignment, candidate generation, NNLS
src/ui.js         state, rendering, canvas plots, CSV export
src/style.css     styles
test/run.js       engine tests against synthetic traces
tools/bundle.js   builds the single-file version
```

## Licence

MIT. See `LICENSE`.
