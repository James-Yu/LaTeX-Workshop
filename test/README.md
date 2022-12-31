# Overview

## Executing tests

We start a new VS Code instance for `testground` and `multiroot` directories in `test/fixtures/`, which includes a series of TeX-related files for tests, and execute appropriate tests defined in `suites/*.test.ts` while skipping other tests not related to the directory.
For tests of building a LaTeX file, we try to build a LaTeX file in the directory.
If a PDF file is not generated, the test fails.
The TeX files related are automatically created before the test and removed after.

### How tests are executed via CLI

1. `runTest.ts` starts a new VS Code instance for each `fixture` directory and executes `suites/index.ts`.
2. Tests in `*.test.ts` are executed through test `runTest()` function defined in `suites/utils.ts`, which skip tests in `*.test.ts` if they are not related to the current `fixture` directory.

### How tests are executed via VS Code launch

We have a `Run Tests` launch configuration in `.vscode/launch.json`.
In the config item, the first `args` passed to `code` defines the workspace to open: `testground` typically, and `multiroot/resource.code-workspace` for the multi-root workspace tests.
Additionally, the `LATEXWORKSHOP_SUITE` envvar defines the suites to be executed, separated by commas and all if left empty.


## Executing Tests on GitHub Actions

Read [.github/workflows](https://github.com/James-Yu/LaTeX-Workshop/tree/master/.github/workflows) to see how tests are executed on GitHub Actions.
