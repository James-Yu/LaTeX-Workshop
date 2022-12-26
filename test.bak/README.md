# Overview

## Executing tests

We start a new VS Code instance for each `fixture` directory in `fixtures/*/`, which includes a TeX file for tests, and execute an appropriate test defined in `*.test.ts` while skipping other tests not related to the directory. For tests of building a LaTeX file, we try to build a LaTeX file in the directory. If a PDF file is not generated, the test fails. With this approach, we can debug the extension by opening a TeX file in the `fixture` directory if the test fails.

## How tests executed

1. `runTest.ts` starts a new VS Code instance for each `fixture` directory and executes `*.index.ts`.
2. `*.index.ts` runs all the tests defined in `*.test.ts`.
3. Tests in `*.test.ts` are executed through `runTestWithFixture`.
4. `runTestWithFixture` skip tests in `*.test.ts` if they are not related to the current `fixture` directory.

### Unit tests

Unit tests are under the `unittests` directory.

## Executing Tests on GitHub Actions

Read [.github/workflows](https://github.com/James-Yu/LaTeX-Workshop/tree/master/.github/workflows) to see how tests are executed on GitHub Actions.
