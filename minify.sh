rm -rf node_modules/mathjax/
cp -rf viewer/mathjax/ node_modules/mathjax/

rm -f node_modules/pdfjs-dist/build/pdf.min.js
rm -f node_modules/pdfjs-dist/build/pdf.worker.min.js
rm -f node_modules/pdfjs-dist/build/pdf.combined.js
rm -rf node_modules/pdfjs-dist/build/*.js.map
rm -rf node_modules/pdfjs-dist/external/
rm -rf node_modules/pdfjs-dist/lib/
rm -rf node_modules/pdfjs-dist/web/

