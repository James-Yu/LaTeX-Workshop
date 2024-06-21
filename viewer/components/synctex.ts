import type {ILatexWorkshopPdfViewer, IPDFViewerApplication} from './interface.js'

declare const PDFViewerApplication: IPDFViewerApplication

export class SyncTex {
    reverseSynctexKeybinding: string = 'ctrl-click'

    constructor(private readonly lwApp: ILatexWorkshopPdfViewer) { }

    private callSynctex(e: MouseEvent, page: number, pageDom: HTMLElement, viewerContainer: HTMLElement) {
        const canvasDom = pageDom.getElementsByTagName('canvas')[0]
        const selection = window.getSelection()
        let textBeforeSelection = ''
        let textAfterSelection = ''
        // workaround for https://github.com/James-Yu/LaTeX-Workshop/issues/1314
        if(selection && selection.anchorNode && selection.anchorNode.nodeName === '#text'){
            const text = selection.anchorNode.textContent
            if (text) {
                textBeforeSelection = text.substring(0, selection.anchorOffset)
                textAfterSelection = text.substring(selection.anchorOffset)
            }
        }
        const canvas = document.getElementsByClassName('canvasWrapper')[0] as HTMLElement
        const left = e.pageX - pageDom.offsetLeft + viewerContainer.scrollLeft - canvas.offsetLeft
        const top = e.pageY - pageDom.offsetTop + viewerContainer.scrollTop - canvas.offsetTop
        const pos = PDFViewerApplication.pdfViewer._pages[page-1].getPagePoint(left, canvasDom.offsetHeight - top)
        this.lwApp.send({type: 'reverse_synctex', pdfFileUri: this.lwApp.pdfFileUri, pos, page, textBeforeSelection, textAfterSelection})
    }

    registerListenerOnEachPage() {
        const keybinding = this.reverseSynctexKeybinding
        const viewerDom = document.getElementById('viewer') as HTMLElement
        for (const pageDom of viewerDom.childNodes as NodeListOf<HTMLElement>) {
            const page = Number(pageDom.dataset.pageNumber)
            const viewerContainer = document.getElementById('viewerContainer') as HTMLElement
            switch (keybinding) {
                case 'ctrl-click': {
                    pageDom.onclick = (e) => {
                        if (!(e.ctrlKey || e.metaKey)) {
                            return
                        }
                        this.callSynctex(e, page, pageDom, viewerContainer)
                    }
                    break
                }
                case 'double-click': {
                    pageDom.ondblclick = (e) => {
                        this.callSynctex(e, page, pageDom, viewerContainer)
                    }
                    break
                }
                default: {
                    console.log(`Unknown keybinding ${keybinding} (view.pdf.internal.synctex.keybinding)`)
                    break
                }
            }
        }
    }
}
