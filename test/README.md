## Overview

### Executing tests

We start a new VS Code instance each `fixture` directory in `fixtures/build/` and `fixtures/viewer/`, and execute an appropriate test defined in `build.test.ts` while skipping other tests not related to the directory. Each test tries to build a TeX file in the directory. If a PDF file is not generated, the test fails. With this approach, we can debug the extension by opening a TeX file in the `fixture` directory if the test fails.
