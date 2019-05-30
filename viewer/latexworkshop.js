const embedded = window.parent !== window
let documentTitle = ''

// PDFViewerApplication detects whether it's embedded in an iframe (window.parent !== window)
// and if so it behaves more "discretely", eg it disables its history mechanism.
// We dont want that, so we unset the flag here (to keep viewer.js as vanilla as possible)
//
PDFViewerApplication.isViewerEmbedded = false;

class ViewerHistory {
  constructor() {
    this._history = []
    this._currentIndex = undefined
  }

  last() {
    return this._history[this._history.length-1]
  }

  lastIndex() {
    if (this._history.length === 0) {
      return undefined
    } else {
      return this._history.length - 1
    }
  }

  length() {
    return this._history.length
  }

  set(scroll, force = false) {
    if (this._history.length === 0) {
      this._history.push({scroll: scroll, temporary: false})
      this._currentIndex = 0
      return
    }

    if (this._currentIndex === undefined) {
      console.log('this._current === undefined never happens here.')
      return
    }

    const curScroll = this._history[this._currentIndex].scroll
    if (curScroll !== scroll || force) {
      this._history = this._history.slice(0, this._currentIndex + 1)
      if (this.last()) {
        this.last().temporary = false
      }
      this._history.push({scroll: scroll, temporary: false})
      if (this.length() > 30) {
        this._history = this._history.slice(this.length() - 30)
      }
      this._currentIndex = this.lastIndex()
    }
  }

  back() {
    if (this.length() === 0) {
      return
    }
    const container = document.getElementById('viewerContainer')
    let cur = this._currentIndex
    let prevScroll = this._history[cur].scroll
    if (this.length() > 0 && prevScroll !== container.scrollTop) {
      if (this._currentIndex === this.lastIndex() && this.last()) {
        if (this.last().temporary) {
          this.last().scroll = container.scrollTop
          cur = cur - 1
          prevScroll = this._history[cur].scroll
        } else {
          const tmp = {scroll: container.scrollTop, temporary: true};
          this._history.push(tmp);
        }
      }
    }
    if (prevScroll !== container.scrollTop) {
      this._currentIndex = cur
      container.scrollTop = prevScroll
    } else {
      if (cur === 0) {
        return
      }
      const scrl = this._history[cur-1].scroll
      this._currentIndex = cur - 1
      container.scrollTop = scrl
    }
  }

  forward() {
    if (this._currentIndex === this.lastIndex()) {
      return
    }
    const container = document.getElementById('viewerContainer')
    const cur = this._currentIndex
    const nextScroll = this._history[cur+1].scroll
    if (nextScroll !== container.scrollTop) {
      this._currentIndex = cur + 1
      container.scrollTop = nextScroll
    } else {
      if (cur >= this._history.length - 2) {
        return
      }
      const scrl = this._history[cur+2].scroll
      this._currentIndex = cur + 2
      container.scrollTop = scrl
    }
  }
}

let viewerHistory = new ViewerHistory()

let query = document.location.search.substring(1)
let parts = query.split('&')
let file
for (let i = 0, ii = parts.length; i < ii; ++i) {
    let param = parts[i].split('=')
    if (param[0].toLowerCase() === 'file') {
        file = param[1].replace('/pdf:', '')
        documentTitle = decodeURIComponent(decodeURIComponent(file)).split(/[\\/]/).pop()
        document.title = documentTitle
    } else if (param[0].toLowerCase() === 'incode' && param[1] === '1') {
        const dom = document.getElementsByClassName('print')
        for (let j = 0; j < dom.length; ++j) {
          dom.item(j).style.display='none'
        }
    }
}
let server = `ws://${window.location.hostname}:${window.location.port}`

let socket = new WebSocket(server)
socket.addEventListener("open", () => socket.send(JSON.stringify({type:"open", path:file, viewer:(embedded ? "tab" : "browser")})))
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

            // set positions before and after SyncTeX to viewerHistory
            viewerHistory.set(container.scrollTop)
            container.scrollTop = scrollY - document.body.offsetHeight * 0.4
            viewerHistory.set(container.scrollTop)

            let indicator = document.getElementById('synctex-indicator')
            indicator.className = 'show'
            indicator.style.left = `${scrollX}px`
            indicator.style.top = `${scrollY}px`
            setTimeout(() => indicator.className = 'hide', 10)
            break
        case "refresh":
            // Note: without showPreviousViewOnLoad = false restoring the position after the refresh will fail if
            // the user has clicked on any link in the past (pdf.js will automatically navigate to that link).
            socket.send(JSON.stringify({type:"position", path:file,
                                        scale:PDFViewerApplication.pdfViewer.currentScaleValue,
                                        scrollMode:PDFViewerApplication.pdfViewer.scrollMode,
                                        spreadMode:PDFViewerApplication.pdfViewer.spreadMode,
                                        scrollTop:document.getElementById('viewerContainer').scrollTop,
                                        scrollLeft:document.getElementById('viewerContainer').scrollLeft,
                                        viewerHistory:{history: viewerHistory._history, currentIndex: viewerHistory._currentIndex}}))
            PDFViewerApplicationOptions.set('showPreviousViewOnLoad', false);
            PDFViewerApplication.open(`/pdf:${decodeURIComponent(file)}`).then( () => {
              // reset the document title to the original value to avoid duplication
              document.title = documentTitle

              // ensure that trimming is invoked if needed.
              setTimeout(() => {
                window.dispatchEvent( new Event('pagerendered') );
              }, 2000);
              setTimeout(() => {
                window.dispatchEvent( new Event('refreshed') );
              }, 2000);
            });
            break
        case "position":
            PDFViewerApplication.pdfViewer.currentScaleValue = data.scale
            PDFViewerApplication.pdfViewer.scrollMode = data.scrollMode
            PDFViewerApplication.pdfViewer.spreadMode = data.spreadMode
            document.getElementById('viewerContainer').scrollTop = data.scrollTop
            document.getElementById('viewerContainer').scrollLeft = data.scrollLeft
            viewerHistory = new ViewerHistory()
            viewerHistory._history = data.viewerHistory.history
            viewerHistory._currentIndex = data.viewerHistory.currentIndex
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
            if (data.trim) {
              const trimSelect = document.getElementById('trimSelect')
              const e = new Event('change')
              if (trimSelect) {
                trimSelect.selectedIndex = data.trim
                trimSelect.dispatchEvent(e)
              }
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

document.addEventListener('pagesinit', () => {
  // check whether WebSocket is open (readyState === 1).
  if (socket.readyState === 1) {
    socket.send(JSON.stringify({type:"loaded", path:file}))
  } else {
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({type:"loaded", path:file}))
    }, {once: true})
  }
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

document.addEventListener('pagerendered', (evPageRendered) => {
    const page = evPageRendered.target.dataset.pageNumber
    const target = evPageRendered.target
    const canvas_dom = evPageRendered.target.childNodes[1]
    canvas_dom.onclick = (e) => {
        if (!(e.ctrlKey || e.metaKey)) {
          return
        }

        const selection = window.getSelection();
        let textBeforeSelection = ''
        let textAfterSelection = ''
        // workaround for https://github.com/James-Yu/LaTeX-Workshop/issues/1314
        if(selection && selection.anchorNode && selection.anchorNode.nodeName === '#text'){
          const text = selection.anchorNode.textContent;
          textBeforeSelection = text.substring(0, selection.anchorOffset);
          textAfterSelection = text.substring(selection.anchorOffset);
        }

        let viewerContainer = null
        // no spread
        if (PDFViewerApplication.pdfViewer.spreadMode === 0) {
          viewerContainer = target.parentNode.parentNode
        } 
        // odd and even spread add an extra spread container
        else {
          viewerContainer = target.parentNode.parentNode.parentNode
        }

        const trimSelect = document.getElementById('trimSelect')
        let left = e.pageX - target.offsetLeft + viewerContainer.scrollLeft
        const top = e.pageY - target.offsetTop + viewerContainer.scrollTop
        if (trimSelect.selectedIndex > 0) {
          const m = canvas_dom.style.left.match(/-(.*)px/)
          const offsetLeft = m ? Number(m[1]) : 0
          left += offsetLeft
        }
        const pos = PDFViewerApplication.pdfViewer._pages[page-1].getPagePoint(left, canvas_dom.offsetHeight - top)
        socket.send(JSON.stringify({type:"click", path:decodeURIComponent(file), pos:pos, page:page,
         textBeforeSelection:textBeforeSelection, textAfterSelection:textAfterSelection}))
    }
}, true)

const setHistory = () => {
  const container = document.getElementById('viewerContainer')
  // set positions before and after clicking to viewerHistory
  viewerHistory.set(container.scrollTop)
  setTimeout(() => {viewerHistory.set(container.scrollTop)}, 500)
}

document.getElementById('viewerContainer').addEventListener("click", setHistory)
document.getElementById('sidebarContainer').addEventListener("click", setHistory)

// back button (mostly useful for the embedded viewer)
document.getElementById("historyBack").addEventListener("click", function() {
  viewerHistory.back()
})

document.getElementById("historyForward").addEventListener("click", function() {
  viewerHistory.forward()
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
      viewerHistory.back();
    } else if(evt.keyCode == 39) {
      viewerHistory.forward();
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
    const viewer = document.getElementById('viewer');
    for ( const page of viewer.getElementsByClassName('page') ) {
      for ( const layer of page.getElementsByClassName('annotationLayer') ) {
        for ( const secionOfAnnotation of layer.getElementsByTagName('section') ) {
          if (secionOfAnnotation.dataset.originalLeft !== undefined) {
            secionOfAnnotation.style.left = secionOfAnnotation.dataset.originalLeft;
          }
        }
      }
    }
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
    if (page.style.width !== "250px") {
      page.style.width = "250px";
    }
    return;
  }
  const w = canvas.style.width;
  const m = w.match(/(\d+)/);
  if (m) {
    // add -4px to ensure that no horizontal scroll bar appears.
    const widthNum = Math.floor(Number(m[1])/trimScale) - 4
    const width = widthNum  + 'px';
    page.style.width = width;
    canvasWrapper.style.width = width;
    const offsetX = - Number(m[1]) * (1 - 1/trimScale) / 2;
    canvas.style.left = offsetX + 'px';
    canvas.style.position = 'relative';
    canvas.setAttribute('data-is-trimmed', 'trimmed');
    if ( textLayer && textLayer.dataset.isTrimmed !== 'trimmed' ) {
      textLayer.style.width = widthNum - offsetX + 'px';
      textLayer.style.left = offsetX + 'px';
      textLayer.setAttribute('data-is-trimmed', 'trimmed');
    }
    const secionOfAnnotationArray = page.getElementsByTagName('section');
    for ( const secionOfAnnotation of secionOfAnnotationArray ) {
      let originalLeft = secionOfAnnotation.style.left;
      if (secionOfAnnotation.dataset.originalLeft === undefined) {
        secionOfAnnotation.setAttribute('data-original-left', secionOfAnnotation.style.left);
      } else {
        originalLeft = secionOfAnnotation.dataset.originalLeft;
      }
      const mat = originalLeft.match(/(\d+)/)
      if (mat) {
        secionOfAnnotation.style.left = (Number(mat[1]) + offsetX) + 'px'
      }
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

const setObserverToTrim = () => {
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
    if (page.dataset.isObserved !== 'observed') {
      observer.observe(page, {attributes: true, childList: true, attributeFilter: ['style']});
      page.setAttribute('data-is-observed', 'observed');
    }
  }
}

// We need to recaluculate scale and left offset for trim mode on each resize event.
window.addEventListener('resize', () =>{
  const trimSelect = document.getElementById("trimSelect");
  const ind = trimSelect.selectedIndex;
  if (!trimSelect || ind <= 0) {
    return;
  }
  trimSelect.selectedIndex = 0;
  const e = new Event('change');
  trimSelect.dispatchEvent(e);
  trimSelect.selectedIndex = ind;
  trimSelect.dispatchEvent(e);
})

// Set observers after a pdf file is loaded in the first time.
window.addEventListener('pagerendered', setObserverToTrim, {once: true});
// Set observers each time a pdf file is refresed.
window.addEventListener('refreshed', setObserverToTrim);
