### Overview

The pdf viewer is based on [PDF.js](https://mozilla.github.io/pdf.js/) by Mozilla Foundation. Files are from the [prebuilt download version](https://mozilla.github.io/pdf.js/getting_started/#download). The reason we do not use `web/pdf_viewer.js` from `pdfjs-dist` package is that `pdf_viewer.js` does not provide features we need. `pdf_viewer.js` is much simpler than `viewer.js`. See [link](https://github.com/mozilla/pdf.js/issues/9318).

Mozilla [asks](https://mozilla.github.io/pdf.js/getting_started/) web developers to reskin `viewer.html` because Firefox users would think bugs of the viewer on the web site are ones of Firefox and would report them to the pdf.js team. See [link](https://github.com/mozilla/pdf.js/issues/5609). Our usage does not cause such a problem.

We provide additional features by setting up new event listeners in `latexworkshop.js` for DOM objects in `viewer.html`. We do not and should not override functions defined by PDF.js.

We can see the [changes](https://github.com/James-Yu/LaTeX-Workshop/commit/c015e2a4aeb56c18c3f8430b9bea63ab4db27b01#diff-ff661e0ff756ae1ff026c0e8f4561d0e) we have made to `viewer.js`. We had better find a way to achieve this without modifying `viewer.js`.

JavaScript files, `latexworkshop.js`, and others, are generated in `../out/viewer/` from TypeScript files.
