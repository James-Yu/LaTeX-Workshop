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

const getSvgXmlById = function (id) {
    const svgelm = document.getElementById(id).getElementsByTagName("svg")[0];
    svgelm.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return svgelm.outerHTML;
}

const svgToDataUrl = function (xml) {
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const b64Start = 'data:image/svg+xml;base64,';
    return b64Start + svg64;
}

const svgAsyncToPngDataUrl = function (svgdataurl) {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    return loadImg(svgdataurl)
    .then( (img) => {
        canvas.width = img.width;
        canvas.height = img.height;
        //    ctx.fillStyle = "rgb(0, 0, 0)";
        //    ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const ret = canvas.toDataURL("image/png");
        img.src = "";
        return ret;
    });
}

const loadImg = function (url) {
    return new Promise( resolve => {
        const img = new Image();
        img.onload = () => { resolve(img, url); };
        img.src = url;
    });
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

window.addEventListener('message', event => {
    const message = event.data; // The JSON data our extension sent
    document.getElementById("tmp00").innerText = message.text;
    renderMathAsyncById("tmp00")
    .then( (tmpid) => {
        if (message.live_preview) {
            setMathInDiv("math00", tmpid);
        }
        if (message.need_dataurl) {
            const xml = getSvgXmlById(tmpid);
            const url = svgToDataUrl(xml);
            document.getElementById(tmpid).style.width = "1px";
            document.getElementById(tmpid).style.height = "1px";
            svgAsyncToPngDataUrl(url)
            .then( (pngdataurl) => {
                vscode.postMessage({
                    dataurl: pngdataurl
                })
            })
        }
    }).catch( err => {
        console.log(err.name + ": " + err.message);
    })
})