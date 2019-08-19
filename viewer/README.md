### Overview

The pdf viewer is based on [PDF.js](https://mozilla.github.io/pdf.js/) by Mozilla Foundation. Files are from the [prebuilt download version](https://mozilla.github.io/pdf.js/getting_started/#download). The reason we do not use `web/pdf_viewer.js` from `pdfjs-dist` package is that `pdf_viewer.js` does not provide features we need. `pdf_viewer.js` is much simpler than `viewer.js`. See [link](https://github.com/mozilla/pdf.js/issues/9318).

Mozilla [asks](https://mozilla.github.io/pdf.js/getting_started/) web developers to reskin `viewer.html` because Firefox users would think bugs of the viewer on the web site are ones of Firefox and would report them to the pdf.js team. See [link](https://github.com/mozilla/pdf.js/issues/5609). Our usage does not cause such a problem.

We provide additional features by setting up new event listeners in `latexworkshop.js` for DOM objects in `viewer.html`. We do not and should not override functions defined by PDF.js.

We can see the [changes](https://github.com/James-Yu/LaTeX-Workshop/compare/a0b97a9...a5f8c04#diff-ff661e0ff756ae1ff026c0e8f4561d0e) we have made to `viewer.js`. We had better find a way to achieve this without modifying `viewer.js`.


### refreshing operation

Since the operation when refreshing the PDF viewer is complicated, we explain. When the PDF viewer is ordered refreshing through WebSocket with a JSON string (type `refresh`), the viewer sends the current position to the server. After a new PDF file loaded, the server sends the position to the viewer with a JSON string (type `position`).

```
When refreshExistingViewer (viewer.ts) called:

server (viewer.ts) -> JSON (type "refresh")  -> pdf viewer (latexworkshop.js)
server (viewer.ts) <- JSON (type "position") <- pdf viewer (latexworkshop.js)

After pageinit:

server (viewer.ts) <- JSON (type "loaded")   <-  pdf viewer (latexworkshop.js)
server (viewer.ts) -> JSON (type "position") ->  pdf viewer (latexworkshop.js)
```