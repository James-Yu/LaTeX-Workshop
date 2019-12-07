export class ViewerHistory {
    _history: { scroll: number, temporary: boolean}[]
    _currentIndex: number | undefined

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

    set(scroll: number, force = false) {
        if (this._history.length === 0) {
            this._history.push({scroll, temporary: false})
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
            this._history.push({scroll, temporary: false})
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
                    const tmp = {scroll: container.scrollTop, temporary: true}
                    this._history.push(tmp)
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
