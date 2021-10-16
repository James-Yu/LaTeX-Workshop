window.addEventListener('message', async (event) => {
    const message = event.data;
    if (message.type !== 'pdf') {
        return
    }
    try {
        const canvas = await renderPdfFile(message.uri, message.pageNumber);
        vscodeApi.postMessage({
            type: 'png',
            uri: message.uri,
            data: canvas.toDataURL()
        })
    } catch (e) {
        vscodeApi.postMessage({
            type: 'png',
            uri: message.uri,
            data: undefined
        })
        throw(e)
    }
})

async function createPdfWorker() {
    const result = await fetch(pdfjsDistUri + '/build/pdf.worker.js');
    const blob = await result.blob();
    const blobUrl = URL.createObjectURL(blob);
    pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(blobUrl);
}

async function renderPdfFile(url, pageNumber) {
    const loadingTask = pdfjsLib.getDocument({
        url,
        cMapUrl: pdfjsDistUri + '/cmaps/',
        cMapPacked: true
    });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNumber);
    const scale = 1.5;
    const viewport = page.getViewport({ scale: scale, });
    // Support HiDPI-screens.
    const outputScale = window.devicePixelRatio || 1;

    //
    // Prepare canvas using PDF page dimensions
    //
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);

    const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
    //
    // Render PDF page into canvas context
    //
    const renderContext = {
        canvasContext: context,
        transform: transform,
        viewport: viewport,
        intent: 'print'
    };
    const renderTask = page.render(renderContext);
    setTimeout(() => renderTask.cancel(), 5000);
    await renderTask.promise;
    return canvas;
}

createPdfWorker()
