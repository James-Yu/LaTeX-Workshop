window.addEventListener('message', async (event) => {
    const message = event.data;
    if (message.type !== 'pdf') {
        return
    }
    try {
        const canvas = await renderPdfFile(message.uri, message.opts);
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

// https://github.com/microsoft/vscode/issues/87282#issuecomment-919464403
async function createPdfWorker() {
    const result = await fetch(pdfjsDistUri + '/build/pdf.worker.mjs');
    const blob = await result.blob();
    const blobUrl = URL.createObjectURL(blob);
    pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(blobUrl, { type: 'module' });
}

async function renderPdfFile(url, opts) {
    const loadingTask = pdfjsLib.getDocument({
        url,
        cMapUrl: pdfjsDistUri + '/cmaps/',
        cMapPacked: true
    });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(opts.pageNumber);
    let scale = 1;
    let viewport = page.getViewport({ scale });

    const height = Math.floor(viewport.height);
    const width = Math.floor(viewport.width);
    scale = Math.min(opts.height/height, opts.width/width);
    viewport = page.getViewport({ scale });

    //
    // Prepare canvas using PDF page dimensions
    //
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    //
    // Render PDF page into canvas context
    //
    const renderContext = {
        canvasContext: context,
        viewport: viewport,
        intent: 'print'
    };
    const renderTask = page.render(renderContext);
    setTimeout(() => renderTask.cancel(), 5000);
    await renderTask.promise;
    return canvas;
}

createPdfWorker()
