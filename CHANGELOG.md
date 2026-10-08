# Changelog

## 1.0.0

First release.

- Reads ABIF (`.ab1`) traces in the browser, including analysed trace channels, base calls, peak locations and quality values.
- Locates the guide on either strand, tolerating up to three mismatches, and places the cut site. Supports SpCas9, SpCas9-NG/SpG, SaCas9 and Cas12a.
- Aligns the edited read to the control upstream of the cut and reverse-complements it when it was sequenced from the opposite end.
- Fits the signal after the cut by non-negative least squares over wild type, deletions, insertions, the donor allele, and the donor allele combined with an indel.
- Reports indel percentage, knockout score, knock-in score, the share of alleles carrying donor changes alongside an indel, and R².
- Breaks the donor down change by change, so a blocking mutation that never converted is visible rather than hidden inside a halved knock-in score.
- Annotates both chromatograms with donor changes, substitutions and mixed positions, collapsing long mixed runs behind a frameshift into a single band.
- Batch analysis with automatic control pairing, CSV sample sheet import, and CSV export.
