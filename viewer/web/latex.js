let query = document.location.search.substring(1)
let parts = query.split('&')
let file
for (let i = 0, ii = parts.length; i < ii; ++i) {
    let param = parts[i].split('=')
    if (param[0].toLowerCase() == "file") {
        file = param[1].replace('/pdf:', '')
        document.title = decodeURIComponent(file).split(/[\\/]/).pop()
    }
}
let server = `ws://${window.location.hostname}:${window.location.port}`

let socket = new WebSocket(server)
socket.addEventListener("open", () => socket.send(JSON.stringify({type:"open", path:file})))
socket.addEventListener("message", (event) => {
    let data = JSON.parse(event.data)
    switch (data.type) {
        case "synctex":
            let pos = PDFViewerApplication.pdfViewer._pages[data.data.page-1].viewport.convertToViewportPoint(data.data.x, data.data.y-72)
            let container = document.getElementById('viewerContainer')
            container.scrollTop = document.getElementsByClassName('page')[0].offsetHeight * data.data.page  - pos[1]
            break
        case "refresh":
            socket.send(JSON.stringify({type:"position",
                                        scale:PDFViewerApplication.pdfViewer.currentScaleValue,
                                        scrollTop:document.getElementById('viewerContainer').scrollTop,
                                        scrollLeft:document.getElementById('viewerContainer').scrollLeft}))
            socket.onclose = () => {}
            location.reload()
            break
        case "position":
            PDFViewerApplication.pdfViewer.currentScaleValue = data.scale
            document.getElementById('viewerContainer').scrollTop = data.scrollTop
            document.getElementById('viewerContainer').scrollLeft = data.scrollLeft
            break
        case "params":
            PDFViewerApplication.pdfViewer.currentScaleValue = data.scale
            if (data.hand) {
                PDFViewerApplication.handTool.handTool.activate()
            } else {
                PDFViewerApplication.handTool.handTool.deactivate()
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

document.addEventListener('pagerendered', (e) => {
    let page = e.target.dataset.pageNumber
    let target = e.target
    let canvas_dom = e.target.childNodes[1]
    canvas_dom.onclick = (e) => {
        if (!(e.ctrlKey || e.metaKey)) return
        let left = e.pageX - target.offsetLeft + target.parentNode.parentNode.scrollLeft
        let top = e.pageY - target.offsetTop + target.parentNode.parentNode.scrollTop - 41
        let pos = PDFViewerApplication.pdfViewer._pages[page-1].getPagePoint(left, canvas_dom.offsetHeight - top)
        socket.send(JSON.stringify({type:"click", path:file, pos:pos, page:page}))
    }
}, true)
