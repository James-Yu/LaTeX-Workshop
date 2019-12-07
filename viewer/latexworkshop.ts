import {ViewerHistory} from './components/viewerhistory.js'
import './components/pagetrimmer.js'

const embedded = window.parent !== window
let documentTitle = ''

declare let PDFViewerApplication: any
declare let PDFViewerApplicationOptions: any

document.addEventListener('webviewerloaded', () => {
  // PDFViewerApplication detects whether it's embedded in an iframe (window.parent !== window)
  // and if so it behaves more "discretely", eg it disables its history mechanism.
  // We dont want that, so we unset the flag here (to keep viewer.js as vanilla as possible)
  //
  PDFViewerApplication.isViewerEmbedded = false
})

const viewerHistory = new ViewerHistory()

const pdfFilePrefix = 'pdf..'

/*
function encodePath(path) {
  const s = encodeURIComponent(path)
  const b64 = window.btoa(s)
  const b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return b64url
}
*/

function decodePath(b64url: string) {
  const tmp = b64url + '='.repeat((4 - b64url.length % 4) % 4)
  const b64 = tmp.replace(/-/g, '+').replace(/_/g, '/')
  const s = window.atob(b64)
  return decodeURIComponent(s)
}

const query = document.location.search.substring(1)
const parts = query.split('&')
let encodedPdfFilePath: string
let pdfFilePath: string
for (let i = 0, ii = parts.length; i < ii; ++i) {
    const param = parts[i].split('=')
    if (param[0].toLowerCase() === 'file') {
        encodedPdfFilePath = param[1].replace(pdfFilePrefix, '')
        pdfFilePath = decodePath(encodedPdfFilePath)
        documentTitle = pdfFilePath.split(/[\\/]/).pop()
        document.title = documentTitle
    } else if (param[0].toLowerCase() === 'incode' && param[1] === '1') {
      document.addEventListener('pagesinit', () => {
        const dom = document.getElementsByClassName('print') as HTMLCollectionOf<HTMLElement>
        for (let j = 0; j < dom.length; ++j) {
          dom.item(j).style.display='none'
        }
      }, {once: true})
    }
}


function callCbOnDidOpenWebSocket(sock: WebSocket, cb: () => void) {
  // check whether WebSocket is already open (readyState === 1).
  if (sock.readyState === 1) {
    cb()
  } else {
    sock.addEventListener('open', () => {
      cb()
    }, {once: true})
  }
}

const server = `ws://${window.location.hostname}:${window.location.port}`

let reverseSynctexKeybinding: string
let socket = new WebSocket(server)

function setupWebSocket() {
  callCbOnDidOpenWebSocket(socket, () => {
    const pack = {
      type: 'open',
      path: pdfFilePath,
      viewer: (embedded ? 'tab' : 'browser')
    }
    socket.send(JSON.stringify(pack))
  })
  socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data)
    switch (data.type) {
      case 'synctex': {
        // use the offsetTop of the actual page, much more accurate than multiplying the offsetHeight of the first page
        const container = document.getElementById('viewerContainer')
        const pos = PDFViewerApplication.pdfViewer._pages[data.data.page - 1].viewport.convertToViewportPoint(data.data.x, data.data.y)
        const page = document.getElementsByClassName('page')[data.data.page - 1] as HTMLElement
        const scrollX = page.offsetLeft + pos[0]
        const scrollY = page.offsetTop + page.offsetHeight - pos[1]

        // set positions before and after SyncTeX to viewerHistory
        viewerHistory.set(container.scrollTop)
        container.scrollTop = scrollY - document.body.offsetHeight * 0.4
        viewerHistory.set(container.scrollTop)

        const indicator = document.getElementById('synctex-indicator')
        indicator.className = 'show'
        indicator.style.left = `${scrollX}px`
        indicator.style.top = `${scrollY}px`
        setTimeout(() => indicator.className = 'hide', 10)
        break
      }
      case 'refresh': {
        // Note: without showPreviousViewOnLoad = false restoring the position after the refresh will fail if
        // the user has clicked on any link in the past (pdf.js will automatically navigate to that link).
        const pack = {
          type: 'position',
          path: pdfFilePath,
          scale: PDFViewerApplication.pdfViewer.currentScaleValue,
          scrollMode: PDFViewerApplication.pdfViewer.scrollMode,
          spreadMode: PDFViewerApplication.pdfViewer.spreadMode,
          scrollTop: document.getElementById('viewerContainer').scrollTop,
          scrollLeft: document.getElementById('viewerContainer').scrollLeft
        }
        PDFViewerApplicationOptions.set('showPreviousViewOnLoad', false)
        PDFViewerApplication.open(`${pdfFilePrefix}${encodedPdfFilePath}`).then( () => {
          // reset the document title to the original value to avoid duplication
          document.title = documentTitle

          // ensure that trimming is invoked if needed.
          setTimeout(() => {
            window.dispatchEvent( new Event('pagerendered') )
          }, 2000)
          setTimeout(() => {
            window.dispatchEvent( new Event('refreshed') )
          }, 2000)
        })
        document.addEventListener('pagesinit', () => {
          PDFViewerApplication.pdfViewer.currentScaleValue = pack.scale
          PDFViewerApplication.pdfViewer.scrollMode = pack.scrollMode
          PDFViewerApplication.pdfViewer.spreadMode = pack.spreadMode
          document.getElementById('viewerContainer').scrollTop = pack.scrollTop
          document.getElementById('viewerContainer').scrollLeft = pack.scrollLeft
        }, {once: true})
        break
      }
      case 'params':
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
          const trimSelect = document.getElementById('trimSelect') as HTMLSelectElement
          const e = new Event('change')
          if (trimSelect) {
            trimSelect.selectedIndex = data.trim
            trimSelect.dispatchEvent(e)
          }
        }
        if (data.invert > 0) {
          document.querySelector('html').style.filter = `invert(${data.invert * 100}%)`
          document.querySelector('html').style.background = 'white'
        }
        (document.querySelector('#viewerContainer') as HTMLElement).style.background = data.bgColor
        if (data.keybindings) {
          reverseSynctexKeybinding = data.keybindings['synctex']
          registerSynctexKeybinding(reverseSynctexKeybinding)
        }
        break
      default:
        break
    }
  })

  socket.onclose = () => {
    document.title = `[Disconnected] ${documentTitle}`
    console.log('Closed: WebScocket to LaTeX Workshop.')
    setTimeout( () => {
      console.log('Try to reconnect to LaTeX Workshop.')
      socket = new WebSocket(server)
      callCbOnDidOpenWebSocket(socket, () => {
        document.title = documentTitle
        setupWebSocket()
        console.log('Reconnected: WebScocket to LaTeX Workshop.')
      })
    }, 3000)
  }
}
setupWebSocket()

document.addEventListener('pagesinit', () => {
  callCbOnDidOpenWebSocket(socket, () => {
    socket.send(JSON.stringify({type:'loaded', path:pdfFilePath}))
  })
}, {once: true})

// Send packets every 30 sec to prevent the connection closed by timeout.
setInterval( () => {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify({type: 'ping'}))
  }
}, 30000)

// if we're embedded we cannot open external links here. So we intercept clicks and forward them to the extension
if (embedded) {
  document.addEventListener('click', (e) => {
      const target = e.target as HTMLAnchorElement
      if (target.nodeName === 'A' && !target.href.startsWith(window.location.href)) { // is external link
        socket.send(JSON.stringify({type:'external_link', url:target.href}))
        e.preventDefault()
      }
  })
}


function callSynctex(e: MouseEvent, page: number, pageDom: HTMLElement, viewerContainer: HTMLElement) {
  const canvasDom = pageDom.getElementsByTagName('canvas')[0]
  const selection = window.getSelection()
    let textBeforeSelection = ''
    let textAfterSelection = ''
    // workaround for https://github.com/James-Yu/LaTeX-Workshop/issues/1314
    if(selection && selection.anchorNode && selection.anchorNode.nodeName === '#text'){
      const text = selection.anchorNode.textContent
      textBeforeSelection = text.substring(0, selection.anchorOffset)
      textAfterSelection = text.substring(selection.anchorOffset)
    }
    const trimSelect = document.getElementById('trimSelect') as HTMLSelectElement
    let left = e.pageX - pageDom.offsetLeft + viewerContainer.scrollLeft
    const top = e.pageY - pageDom.offsetTop + viewerContainer.scrollTop
    if (trimSelect.selectedIndex > 0) {
      const m = canvasDom.style.left.match(/-(.*)px/)
      const offsetLeft = m ? Number(m[1]) : 0
      left += offsetLeft
    }
    const pos = PDFViewerApplication.pdfViewer._pages[page-1].getPagePoint(left, canvasDom.offsetHeight - top)
    socket.send(JSON.stringify({type: 'reverse_synctex', path:pdfFilePath, pos, page, textBeforeSelection, textAfterSelection}))
}

function registerSynctexKeybinding(keybinding: string) {
  const viewerDom = document.getElementById('viewer')
  for (const pageDom of viewerDom.childNodes as NodeListOf<HTMLElement>) {
    const page = Number(pageDom.dataset.pageNumber)
    const viewerContainer = document.getElementById('viewerContainer')
    switch (keybinding) {
      case 'ctrl-click':
        pageDom.onclick = (e) => {
          if (!(e.ctrlKey || e.metaKey)) {
            return
          }
          callSynctex(e, page, pageDom, viewerContainer)
        }
        break
      case 'double-click':
          pageDom.ondblclick = (e) => {
            callSynctex(e, page, pageDom, viewerContainer)
          }
          break
      default:
        console.log(`Unknown keybinding ${keybinding} (view.pdf.internal.synctex.keybinding)`)
        break
    }
  }
}

document.addEventListener('pagesinit', () => {
  if (reverseSynctexKeybinding) {
    registerSynctexKeybinding(reverseSynctexKeybinding)
  }
})

const setHistory = () => {
  const container = document.getElementById('viewerContainer')
  // set positions before and after clicking to viewerHistory
  viewerHistory.set(container.scrollTop)
  setTimeout(() => {viewerHistory.set(container.scrollTop)}, 500)
}


document.getElementById('viewerContainer').addEventListener('click', setHistory)
document.getElementById('sidebarContainer').addEventListener('click', setHistory)

// back button (mostly useful for the embedded viewer)
document.getElementById('historyBack').addEventListener('click', () => {
  viewerHistory.back()
})

document.getElementById('historyForward').addEventListener('click', () => {
  viewerHistory.forward()
})


// keyboard bindings
window.addEventListener('keydown', (evt) => {
  // F opens find bar, cause Ctrl-F is handled by vscode
  const target = evt.target as HTMLElement
  if(evt.keyCode === 70 && target.nodeName !== 'INPUT') { // ignore F typed in the search box
    showToolbar(false)
    PDFViewerApplication.findBar.open()
    evt.preventDefault()
  }

  // Chrome's usual Alt-Left/Right (Command-Left/Right on OSX) for history
  // Back/Forward don't work in the embedded viewer, so we simulate them.
  if (embedded && (evt.altKey || evt.metaKey)) {
    if (evt.keyCode === 37) {
      viewerHistory.back()
    } else if(evt.keyCode === 39) {
      viewerHistory.forward()
    }
  }
})

let hideToolbarInterval: number | undefined
function showToolbar(animate: boolean) {
  if (hideToolbarInterval) {
    clearInterval(hideToolbarInterval)
  }
  const d = document.getElementsByClassName('toolbar')[0]
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
