const mathjaxInitialization = new Promise(resolve => {
    MathJax.Hub.Register.StartupHook('End', resolve);
})

const mathjaxInitialRendering = new Promise(resolve => {
    MathJax.Hub.Queue(resolve);
})

const renderMathAsyncById = function(id) {
    return new Promise( resolve => {
        MathJax.Hub.Queue(
            ["Typeset",MathJax.Hub,id],
            [resolve, id]
        );
    });
}

const getSvgXmlById = function (id, scale) {
    const svgelm = document.getElementById(id).getElementsByTagName("svg")[0];
    svgelm.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const m0 = svgelm.getAttribute("width").match(/([\.\d]+)(\w+)/);
    const m1 = svgelm.getAttribute("height").match(/([\.\d]+)(\w+)/);
    const w = scale* Number(m0[1]);
    const h = scale * Number(m1[1]);
    svgelm.setAttribute("width", w + m0[2]);
    svgelm.setAttribute("height", h + m1[2]);
    return svgelm.outerHTML;
}

const svgToDataUrl = function (xml) {
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const b64Start = 'data:image/svg+xml;base64,';
    return b64Start + svg64;
}

// We cannot know actual colors for each theme in extension process
// because VSCode API does not allow such operations.
// c.f., https://github.com/Microsoft/vscode/issues/32813
// But we can know the colors in WebView process through CSS variables,
// :root { --color; --vscode-editorHoverWidget-background; }.
const pickColor = function (prop) {
   m = prop.match(/rgb\((\d+), (\d+), (\d+)\)/)
   if (m) {
       return [m[1], m[2], m[3]];
   }
   return null;
}

const getVSCodeEditorForegound = function () {
    const s = window.getComputedStyle(document.getElementById("colorpick"));
    return pickColor(s.color);
}

const getVSCodeHoverBackgound = function () {
    const s = window.getComputedStyle(document.getElementById("colorpick"))
    return pickColor(s.background);
}

const vscode = acquireVsCodeApi();

mathjaxInitialization
.then( () => {
    MathJax.Hub.Register.MessageHook("Math Processing Error", (message) => {
        console.error(message);
    })
});

const setMathInDiv = function (divid, tmpid) {
    document.getElementById(divid).innerHTML = document.getElementById(tmpid).getElementsByTagName("svg")[0].outerHTML;
}

const setVSCodeForegroundColor = function(tex) {
    const rgb = getVSCodeEditorForegound();
    const color = '\\color[RGB]{' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + '}';
    var ret = tex.replace(/^(\$|\\\(|\\\[|\\begin{.*?}({.*?})*)/, '$1' + color);
    // insert \color{ } after each & and \\
    // while skipping CD env
    ret = ret.replace(/(\\begin{CD}[\s\S]*?\\end{CD}|((?:\\[^\\]|[^&\\])*&+|\\\\))/g, '$1' + color);
    return ret;
}

window.addEventListener('message', event => {
    const message = event.data; // The JSON data our extension sent
    document.getElementById("tmp00").innerText = setVSCodeForegroundColor(message.text);
    renderMathAsyncById("tmp00")
    .then( (tmpid) => {
        if (message.need_dataurl) {
            const xml = getSvgXmlById(tmpid, message.scale);
            const svgdataurl = svgToDataUrl(xml);
            document.getElementById(tmpid).style.width = "1px";
            document.getElementById(tmpid).style.height = "1px";
            vscode.postMessage({ dataurl: svgdataurl })
        }
    }).catch( err => {
        console.log(err.name + ": " + err.message);
    })
})
