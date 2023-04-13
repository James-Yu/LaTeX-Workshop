import os
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('-w', '--web', help=f'Path to pdf.js distributed web/ folder, end without `/`', type=str)
parser.add_argument('-v', '--viewer', help=f'Path to extension viewer/ folder, end without `/`', type=str)
args = parser.parse_args()
webViewerLoaded=False

with open(args.web + '/viewer.html', 'rt') as fin:
    with open(args.viewer + '/viewer.html', 'wt') as fout:
        for line in fin:
            fout.write(
                line.replace('''<title>PDF.js viewer</title>''', '''<meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'none'; connect-src 'self' ws://127.0.0.1:*; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;">\n    <title>PDF.js viewer</title>''')
                    .replace('''<link rel="stylesheet" href="viewer.css">''', '''<link rel="stylesheet" href="viewer.css">\n    <link rel="stylesheet" href="latexworkshop.css">''')
                    .replace('''<script src="../build/pdf.js"></script>''', '''<script src="build/pdf.js" defer></script>''')
                    .replace('''<script src="viewer.js"></script>''', '''<script src="out/viewer/latexworkshop.js" type="module"></script>''')
            )

with open(args.web + '/viewer.js', 'rt') as fin:
    with open(args.viewer + '/viewer.js', 'wt') as fout:
        for line in fin:
            if str(line) == "function webViewerLoad() {\n":
                webViewerLoaded=True
            if webViewerLoaded:
                fout.write(
                        line.replace('''const event = document.createEvent("CustomEvent");''','''const event = new CustomEvent("webviewerloaded", {''')
                            .replace('''event.initCustomEvent("webviewerloaded", true, true, {''','''bubbles: true,cancelable: true,detail: {''')
                            .replace('''source: window''','''source: window}''')
                            .replace('''  try {''','''  document.dispatchEvent(event);\ntry {''')
                            .replace('''console.error(`webviewerloaded: ''', '''// console.error(`webviewerloaded: ''')
                )
            else:
                fout.write(
                    line.replace('''this.setTitle(title);''', '''// this.setTitle(title);''')
                        .replace('''const MATCH_SCROLL_OFFSET_TOP = -50;''', '''const MATCH_SCROLL_OFFSET_TOP = -100;''')
                        .replace('''this.switchView(view, true);''', '''this.switchView(view, false);''')
                        .replace('''this.removePageBorders = options.removePageBorders || false;''', '''this.removePageBorders = options.removePageBorders || true;''')
                        .replace('''localStorage.setItem("pdfjs.history", databaseStr);''', '''// localStorage.setItem("pdfjs.history", databaseStr);''')
                        .replace('''return localStorage.getItem("pdfjs.history");''', '''return // localStorage.getItem("pdfjs.history");''')
                        .replace('''localStorage.setItem("pdfjs.preferences", JSON.stringify(prefObj));''', '''// localStorage.setItem("pdfjs.preferences", JSON.stringify(prefObj));''')
                        .replace('''return JSON.parse(localStorage.getItem("pdfjs.preferences"));''', '''return // JSON.parse(localStorage.getItem("pdfjs.preferences"));''')
                        .replace('''console.warn('#' + key + ' is undefined.');''', '''// console.warn('#' + key + ' is undefined.');''')
                        .replace('''(!event.shiftKey || window.chrome || window.opera)) {''', '''(!event.shiftKey || window.chrome || window.opera)) {\n    if (window.parent !== window) {\n      return;\n    }''')
                        .replace('''console.log(`PDF ${pdfDocument.''', '''// console.log(`PDF ${pdfDocument.''')
                        .replace('''pdfjsLib = require("../build/pdf.js");''','''pdfjsLib = require("./build/pdf.js");''')
                        .replace('''value: "../build/pdf.worker.js",''', '''  value: "./build/pdf.worker.js",''')
                        .replace('''console.log(`PDF ${pdfDocument.''', '''// console.log(`PDF ${pdfDocument.''')
                )

os.system(f'git diff --no-index {args.web}/viewer.html {args.viewer}/viewer.html > {args.viewer}/../dev/viewer/viewer.html.diff')
os.system(f'git diff --no-index {args.web}/viewer.js {args.viewer}/viewer.js > {args.viewer}/../dev/viewer/viewer.js.diff')