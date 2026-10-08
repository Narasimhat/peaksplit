# Contributing

Bug reports with the `.ab1` files that triggered them are the most useful thing you can send, assuming the sequence is not confidential. Most problems found so far have come from traces that broke an assumption in the model rather than from code defects, and a real example makes that visible immediately.

## Working on the code

There is no build step. Edit the files in `src/` and reload `index.html`. Run `npm test` before opening a pull request; it checks the engine against synthetic traces with known allele mixtures and takes a couple of seconds.

`src/core.js` holds everything scientific: the ABIF parser, Smith–Waterman alignment, candidate allele construction and the NNLS solver. It has no DOM dependencies and is exercised directly by the tests. `src/ui.js` holds state, rendering and the canvas plots. Keeping that split means a change to the model can be tested without touching the interface.

If you change how alleles are scored, add a test with a planted mixture and assert the recovered percentages. The existing tests in `test/run.js` show the pattern.

## Things worth adding

Multiplexed guides and paired-guide deletions are the largest gap. Prime editing would need a different candidate model. Base editing works today through the composition table but has no dedicated scoring. An allele-level export for feeding downstream analysis has been asked for more than once.
