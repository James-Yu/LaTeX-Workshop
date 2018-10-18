rm -rf node_modules/mathjax/
cp -rf viewer/mathjax/ node_modules/mathjax/

rm node_modules/pdfjs-dist/build/*.js.map
rm -rf node_modules/pdfjs-dist/external/
rm -rf node_modules/pdfjs-dist/lib/
rm -rf node_modules/pdfjs-dist/web/
