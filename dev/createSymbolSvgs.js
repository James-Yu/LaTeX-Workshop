'use strict';
exports.__esModule = true;
var fs_1 = require('fs');
var path = require('path');
var mathJax;
Promise.resolve()
    .then(function() {
        return require('mathjax-node');
    })
    .then(function(mj) {
        mathJax = mj;
        mj.config({
            MathJax: {
                jax: ['input/TeX', 'output/SVG'],
                extensions: ['tex2jax.js', 'MathZoom.js'],
                showMathMenu: false,
                showProcessingMessages: false,
                messageStyle: 'none',
                SVG: {
                    useGlobalCache: false
                },
                TeX: {
                    extensions: ['AMSmath.js', 'AMSsymbols.js', 'autoload-all.js', 'color.js', 'noUndefined.js']
                }
            }
        });
        mj.start();
    })
    .then(function() {
        loadSnippets();
    });
function loadSnippets() {
    var snipetsFile = path.resolve('..', 'resources', 'snippetpanel', 'snippetpanel.json');
    var snippets = JSON.parse(fs_1.readFileSync(snipetsFile, { encoding: 'utf8' }));
    var mathSymbolPromises = [];
    for (var category in snippets.mathSymbols) {
        var _loop_1 = function(i) {
            var symbol = snippets.mathSymbols[category][i];
            mathSymbolPromises.push(
                new Promise(function(resolve, reject) {
                    mathJax
                        .typeset({
                            math: symbol.source,
                            format: 'TeX',
                            svgNode: true
                        })
                        .then(function(data) {
                            var svg = data.svgNode.outerHTML;
                            try {
                                const a = symbol.name.toLocaleUpperCase();
                            } catch (error) {
                                console.log('err');
                            }
                            svg = svg.replace(
                                /<title([^>]*)>(.*)<\/title>/,
                                '<title$1>' +
                                    symbol.name.toLocaleUpperCase() +
                                    '.' +
                                    (symbol.keywords ? ' Keywords: ' + symbol.keywords : '') +
                                    '</title>'
                            );
                            if (symbol.shrink) {
                                svg = svg.replace(/^<svg/, '<svg class="shrink"');
                            }
                            symbol.svg = svg;
                            resolve();
                        })
                        ['catch'](reject);
                })
            );
        };
        for (var i = 0; i < snippets.mathSymbols[category].length; i++) {
            _loop_1(i);
        }
    }
    Promise.all(mathSymbolPromises)['finally'](function() {
        if (mathSymbolPromises.length > 0) {
            fs_1.writeFileSync(snipetsFile, JSON.stringify(snippets, undefined, 4));
            console.log('LaTeX-Workshop: ' + mathSymbolPromises.length + ' symbols rendered and saved');
        }
    });
}
