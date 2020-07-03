## Overview

### Executing tests

We start a new VS Code instance each `fixture` directory in `fixtures/build/` and others, and execute an appropriate test defined in `build.test.ts` while skipping other tests not related to the directory. Fot tests of building a LaTeX file, we try to build a LaTeX file in the directory. If a PDF file is not generated, the test fails. With this approach, we can debug the extension by opening a TeX file in the `fixture` directory if the test fails.

- `runTest.ts` starts a new VS Code instance each `fixture` directory.
- `*.index.ts` runs all the tests defined in `*.test.ts`.
- Tests in `*.test.ts` are executed through `runTestWithFixture`.
- `runTestWithFixture` skip tests in `*.test.ts` if they are not related to the current `fixture` directory.
