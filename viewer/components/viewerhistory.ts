import {ILatexWorkshopPdfViewer} from './interface.js'

export class ViewerHistory {
    private history: { scroll: number, temporary: boolean}[]
    private currentIndex: number | undefined
    private readonly lwApp: ILatexWorkshopPdfViewer

    constructor(lwApp: ILatexWorkshopPdfViewer) {
        this.history = []
        this.currentIndex = undefined
        this.lwApp = lwApp
        this.registerKeybinding()
    }

    private registerKeybinding() {
        const setHistory = () => {
            const container = document.getElementById('viewerContainer') as HTMLElement
            // set positions before and after clicking to viewerHistory
            this.lwApp.viewerHistory.set(container.scrollTop)
            setTimeout(() => {this.lwApp.viewerHistory.set(container.scrollTop)}, 500)
        };

        (document.getElementById('viewerContainer') as HTMLElement).addEventListener('click', setHistory);
        (document.getElementById('sidebarContainer') as HTMLElement).addEventListener('click', setHistory);

        // back button (mostly useful for the embedded viewer)
        (document.getElementById('historyBack') as HTMLElement).addEventListener('click', () => {
            this.lwApp.viewerHistory.back()
        });

        (document.getElementById('historyForward') as HTMLElement).addEventListener('click', () => {
            this.lwApp.viewerHistory.forward()
        })
    }

    private last() {
        return this.history[this.history.length-1]
    }

    private lastIndex() {
        if (this.history.length === 0) {
            return undefined
        } else {
            return this.history.length - 1
        }
    }

    private length() {
        return this.history.length
    }

    set(scroll: number, force = false) {
        if (this.history.length === 0) {
            this.history.push({scroll, temporary: false})
            this.currentIndex = 0
            return
        }

        if (this.currentIndex === undefined) {
            console.log('this._current === undefined never happens here.')
            return
        }

        const curScroll = this.history[this.currentIndex].scroll
        if (curScroll !== scroll || force) {
            this.history = this.history.slice(0, this.currentIndex + 1)
            if (this.last()) {
                this.last().temporary = false
            }
            this.history.push({scroll, temporary: false})
            if (this.length() > 30) {
                this.history = this.history.slice(this.length() - 30)
            }
            this.currentIndex = this.lastIndex()
        }
    }

    back() {
        if (this.length() === 0) {
            return
        }
        const container = document.getElementById('viewerContainer') as HTMLElement
        let cur = this.currentIndex
        if (cur === undefined) {
            return
        }
        let prevScroll = this.history[cur].scroll
        if (this.length() > 0 && prevScroll !== container.scrollTop) {
            if (this.currentIndex === this.lastIndex() && this.last()) {
                if (this.last().temporary) {
                    this.last().scroll = container.scrollTop
                    cur = cur - 1
                    prevScroll = this.history[cur].scroll
                } else {
                    const tmp = {scroll: container.scrollTop, temporary: true}
                    this.history.push(tmp)
                }
            }
        }
        if (prevScroll !== container.scrollTop) {
            this.currentIndex = cur
            container.scrollTop = prevScroll
        } else {
            if (cur === 0) {
                return
            }
            const scrl = this.history[cur-1].scroll
            this.currentIndex = cur - 1
            container.scrollTop = scrl
        }
    }

    forward() {
        if (this.currentIndex === this.lastIndex()) {
            return
        }
        const container = document.getElementById('viewerContainer') as HTMLElement
        const cur = this.currentIndex
        if (cur === undefined) {
            return
        }
        const nextScroll = this.history[cur+1].scroll
        if (nextScroll !== container.scrollTop) {
            this.currentIndex = cur + 1
            container.scrollTop = nextScroll
        } else {
            if (cur >= this.history.length - 2) {
                return
            }
            const scrl = this.history[cur+2].scroll
            this.currentIndex = cur + 2
            container.scrollTop = scrl
        }
    }
}
