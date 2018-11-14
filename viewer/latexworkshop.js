const embedded = window.parent !== window

// PDFViewerApplication detects whether it's embedded in an iframe (window.parent !== window)
// and if so it behaves more "discretely", eg it disables its history mechanism.
// We dont want that, so we unset the flag here (to keep viewer.js as vanilla as possible)
//
PDFViewerApplication.isViewerEmbedded = false;
let query = document.location.search.substring(1)
let parts = query.split('&')
let file
for (let i = 0, ii = parts.length; i < ii; ++i) {
    let param = parts[i].split('=')
    if (param[0].toLowerCase() === 'file') {
        file = param[1].replace('/pdf:', '')
        document.title = decodeURIComponent(file).split(/[\\/]/).pop()
    } else if (param[0].toLowerCase() === 'incode' && param[1] === '1') {
        const dom = document.getElementsByClassName('print')
        for (let j = 0; j < dom.length; ++j) {
          dom.item(j).style.display='none'
        }
    }
}
let server = `ws://${window.location.hostname}:${window.location.port}`

let socket = new WebSocket(server)
socket.addEventListener("open", () => socket.send(JSON.stringify({type:"open", path:file})))
socket.addEventListener("message", (event) => {
    let data = JSON.parse(event.data)
    switch (data.type) {
        case "synctex":
            // use the offsetTop of the actual page, much more accurate than multiplying the offsetHeight of the first page
            let container = document.getElementById('viewerContainer')
            var pos = PDFViewerApplication.pdfViewer._pages[data.data.page - 1].viewport.convertToViewportPoint(data.data.x, data.data.y)
            let page = document.getElementsByClassName('page')[data.data.page - 1]
            let scrollX = page.offsetLeft + pos[0]
            let scrollY = page.offsetTop + page.offsetHeight - pos[1]
            container.scrollTop = scrollY - document.body.offsetHeight * 0.4

            let indicator = document.getElementById('synctex-indicator')
            indicator.className = 'show'
            indicator.style.left = `${scrollX}px`
            indicator.style.top = `${scrollY}px`
            setTimeout(() => indicator.className = 'hide', 10)
            break
        case "refresh":
            // Note: without showPreviousViewOnLoad = false restoring the position after the refresh will fail if
            // the user has clicked on any link in the past (pdf.js will automatically navigate to that link).
            socket.send(JSON.stringify({type:"position",
                                        scale:PDFViewerApplication.pdfViewer.currentScaleValue,
                                        scrollMode:PDFViewerApplication.pdfViewer.scrollMode,
                                        spreadMode:PDFViewerApplication.pdfViewer.spreadMode,
                                        scrollTop:document.getElementById('viewerContainer').scrollTop,
                                        scrollLeft:document.getElementById('viewerContainer').scrollLeft}))
            PDFViewerApplicationOptions.set('showPreviousViewOnLoad', false);
            PDFViewerApplication.open(`/pdf:${decodeURIComponent(file)}`).then( () => {
              // ensure that trimming is invoked if needed.
              setTimeout(() => {
                window.dispatchEvent( new Event("pagerendered") );
              }, 1000);
            });
            break
        case "position":
            PDFViewerApplication.pdfViewer.currentScaleValue = data.scale
            PDFViewerApplication.pdfViewer.scrollMode = data.scrollMode
            PDFViewerApplication.pdfViewer.spreadMode = data.spreadMode
            document.getElementById('viewerContainer').scrollTop = data.scrollTop
            document.getElementById('viewerContainer').scrollLeft = data.scrollLeft
            break
        case "params":
            if (data.scale) {
              PDFViewerApplication.pdfViewer.currentScaleValue = data.scale
            }
            if (data.scrollMode) {
              PDFViewerApplication.pdfViewer.scrollMode = data.scrollMode
            }
            if (data.spreadMode) {
              PDFViewerApplication.pdfViewer.spreadMode = data.spreadMode
            }
            if (data.hand) {
                PDFViewerApplication.pdfCursorTools.handTool.activate()
            } else {
                PDFViewerApplication.pdfCursorTools.handTool.deactivate()
            }
            if (data.invert > 0) {
              document.querySelector('#viewer').style.filter = `invert(${data.invert * 100}%)`
              document.querySelector('#viewer').style.background = 'white'
            }
            break
        default:
            break
    }
})
socket.onclose = () => { document.title = `[Disconnected] ${document.title}` }

document.addEventListener('pagesinit', (e) => {
    socket.send(JSON.stringify({type:"loaded", path:file}))
})

// if we're embedded we cannot open external links here. So we intercept clicks and forward them to the extension
if (embedded) {
  document.addEventListener('click', (e) => {
      if (e.target.nodeName == 'A' && !e.target.href.startsWith(window.location.href)) { // is external link
        socket.send(JSON.stringify({type:"external_link", url:e.target.href}))
        e.preventDefault();
      }
  })
}

document.addEventListener('pagerendered', (e) => {
    let page = e.target.dataset.pageNumber
    let target = e.target
    let canvas_dom = e.target.childNodes[1]
    canvas_dom.onclick = (e) => {
        if (!(e.ctrlKey || e.metaKey)) return
        let left = e.pageX - target.offsetLeft + target.parentNode.parentNode.scrollLeft
        let top = e.pageY - target.offsetTop + target.parentNode.parentNode.scrollTop
        let pos = PDFViewerApplication.pdfViewer._pages[page-1].getPagePoint(left, canvas_dom.offsetHeight - top)
        socket.send(JSON.stringify({type:"click", path:file, pos:pos, page:page}))
    }
}, true)

// back button (mostly useful for the embedded viewer)
document.getElementById("historyBack").addEventListener("click", function() {
  history.back()
})

// keyboard bindings
window.addEventListener('keydown', function(evt) {
  // F opens find bar, cause Ctrl-F is handled by vscode
  if(evt.keyCode == 70 && evt.target.nodeName != 'INPUT') { // ignore F typed in the search box
    showToolbar(false)
    PDFViewerApplication.findBar.open()
    evt.preventDefault()
  }

  // Chrome's usual Alt-Left/Right (Command-Left/Right on OSX) for history
  // Back/Forward don't work in the embedded viewer, so we simulate them.
  if (embedded && (evt.altKey || evt.metaKey)) {
    if (evt.keyCode == 37) {
      history.back();
    } else if(evt.keyCode == 39) {
      history.forward();
    }
  }
})

let hideToolbarInterval = undefined
function showToolbar(animate) {
  if (hideToolbarInterval) {
    clearInterval(hideToolbarInterval)
  }
  var d = document.getElementsByClassName('toolbar')[0]
  d.className = d.className.replace(' hide', '') + (animate ? '' : ' notransition')

  hideToolbarInterval = setInterval(() => {
    if(!PDFViewerApplication.findBar.opened && !PDFViewerApplication.pdfSidebar.isOpen &&
       !PDFViewerApplication.secondaryToolbar.isOpen) {
      d.className = d.className.replace(' notransition', '') + ' hide'
      clearInterval(hideToolbarInterval)
    }
  }, 3000)
}

document.getElementById('outerContainer').onmousemove = (e) => {
  if (e.clientY <= 64) {
    showToolbar(true)
  }
}

var currentUserSelectScale = undefined;
var originalUserSelectIndex = undefined;

const getTrimScale = () => {
  var trimSelect = document.getElementById("trimSelect");
  if (trimSelect.selectedIndex <= 0) {
    return 1.0;
  }
  var trimValue = trimSelect.options[trimSelect.selectedIndex].value;
  return 1.0/(1 - 2*trimValue);
};

document.getElementById("trimSelect").addEventListener("change", (ev) => {
  const trimScale = getTrimScale();
  const trimSelect = document.getElementById("trimSelect");
  const scaleSelect = document.getElementById("scaleSelect");
  const e = new Event("change");
  let o;
  if (trimSelect.selectedIndex <= 0) {
    for ( o of scaleSelect.options ) {
      o.disabled = false;
    }
    document.getElementById("trimOption").disabled = true;
    document.getElementById("trimOption").hidden = true;
    if (originalUserSelectIndex !== undefined) {
      scaleSelect.selectedIndex = originalUserSelectIndex;
    }
    scaleSelect.dispatchEvent(e);
    currentUserSelectScale = undefined;
    originalUserSelectIndex = undefined;
    return;
  }
  for ( o of scaleSelect.options ) {
    o.disabled = true;
  }
  if (currentUserSelectScale === undefined) {
    currentUserSelectScale = PDFViewerApplication.pdfViewer._currentScale;
  }
  if (originalUserSelectIndex === undefined) {
    originalUserSelectIndex = scaleSelect.selectedIndex;
  }
  o = document.getElementById("trimOption");
  o.value = currentUserSelectScale * trimScale;
  o.selected = true;
  scaleSelect.dispatchEvent(e);
});

const trimPage = (page) => {
  const trimScale = getTrimScale();
  const textLayer = page.getElementsByClassName("textLayer")[0];
  const canvasWrapper = page.getElementsByClassName("canvasWrapper")[0];
  const canvas = page.getElementsByTagName("canvas")[0];
  if ( !canvasWrapper || !canvas ) {
    page.style.width = "250px";
    return;
  }
  const w = canvas.style.width;
  const m = w.match(/(\d+)/);
  if (m) {
    // add -4px to ensure that no horizontal scroll bar appears.
    const width = ( Math.floor(Number(m[1])/trimScale) - 4 )  + 'px';
    page.style.width = width;
    canvasWrapper.style.width = width;
    const offsetX = '-' + Number(m[1]) * (1 - 1/trimScale) / 2 + "px";
    canvas.style.left = offsetX;
    canvas.style.position = "relative";
    canvas.isTrimmed = true;
    if ( textLayer && !textLayer.isTrimmed ) {
      textLayer.style.width = width;
      textLayer.style.left = offsetX;
      textLayer.isTrimmed = true;
    }
  }
}

window.addEventListener("pagerendered", () => {
  const container = document.getElementById("trimSelectContainer");
  const select = document.getElementById("trimSelect");
  container.setAttribute('style', 'display: inherit;');
  if (container.clientWidth > 0) {
    select.setAttribute('style', 'min-width: inherit;');
    var width = select.clientWidth + 8;
    select.setAttribute('style', 'min-width: ' + (width + 22) + 'px;');
    container.setAttribute('style', 'min-width: ' + width + 'px; ' + 'max-width: ' + width + 'px;');
  }
  if (select.selectedIndex <= 0) {
      return;
  }
  const viewer = document.getElementById("viewer");
  for( let page of viewer.getElementsByClassName("page") ){
    trimPage(page);
  }
});

window.addEventListener("pagerendered", () => {
  const observer = new MutationObserver(records => {
    const trimSelect = document.getElementById("trimSelect");
    if (trimSelect.selectedIndex <= 0) {
        return;
    }
    records.forEach(record => {
      const page = record.target;
      trimPage(page);
    })
  })
  const viewer = document.getElementById("viewer");
  for( let page of viewer.getElementsByClassName("page") ){
    observer.observe(page, {attributes: true, childList: true});
  }
}, {once: true});

document.getElementById("colorSelect").addEventListener("change", (ev) => {
  const colorSelect = document.getElementById("colorSelect");
  if (colorSelect.selectedIndex === 0) {
    document.body.style.backgroundColor = "white";
    document.getElementById("viewer").style.filter = "none";
    return
  }
  if (colorSelect.selectedIndex === 1) {
    document.body.style.backgroundColor = "black";
    document.getElementById("viewer").style.filter = "invert(1)";
    return
  }
});
