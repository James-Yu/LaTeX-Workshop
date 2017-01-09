var query = document.location.search.substring(1);
var parts = query.split('&');
var server, path;
for (var i = 0, ii = parts.length; i < ii; ++i) {
    var param = parts[i].split('=');
    if (param[0].toLowerCase() == "server")
        server = param[1];
    if (param[0].toLowerCase() == "path")
        path = param[1];
}

var socket = new WebSocket(server);
socket.addEventListener("open", () => socket.send(JSON.stringify({type:"open", path:path})));
socket.addEventListener("message", (event) => {
    var data = JSON.parse(event.data);
    switch (data.type) {
        case "synctex":
            var pos = PDFViewerApplication.pdfViewer._pages[data.data.page-1].viewport.convertToViewportPoint(data.data.x, data.data.y-72);
            var container = document.getElementById('viewerContainer');
            container.scrollTop = document.getElementsByClassName('page')[0].offsetHeight * data.data.page  - pos[1];
            break;
        case "get_position":
            socket.send(JSON.stringify({type:"position", 
                                        scale:PDFViewerApplication.pdfViewer.currentScaleValue, 
                                        scrollTop:document.getElementById('viewerContainer').scrollTop, 
                                        scrollLeft:document.getElementById('viewerContainer').scrollLeft}));
            break;
        case "position":
            PDFViewerApplication.pdfViewer.currentScaleValue = data.scale;
            document.getElementById('viewerContainer').scrollTop = data.scrollTop;
            document.getElementById('viewerContainer').scrollLeft = data.scrollLeft;
            break;
        default:
            break;
    }
});

document.addEventListener('pagesinit', (e) => {
    socket.send(JSON.stringify({type:"loaded"}));
});

document.addEventListener('pagerendered', (e) => {
    var page = e.target.dataset.pageNumber;
    var target = e.target;
    var canvas_dom = e.target.childNodes[1];
    canvas_dom.onclick = (e) => {
        if (!e.ctrlKey) return;
        var left = e.pageX - target.offsetLeft + target.parentNode.parentNode.scrollLeft - 9;
        var top = e.pageY - target.offsetTop + target.parentNode.parentNode.scrollTop - 41;
        var pos = PDFViewerApplication.pdfViewer._pages[page-1].getPagePoint(left, canvas_dom.offsetHeight - top);
        socket.send(JSON.stringify({type:"click", path:path, pos:pos, page:page}));
    }
}, true);