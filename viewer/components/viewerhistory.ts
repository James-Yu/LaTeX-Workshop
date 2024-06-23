
let history: { scroll: number, temporary: boolean }[] = []
let currentIndex: number | undefined

export function registerHistoryKeyBind() {
    const setHistory = () => {
        const container = document.getElementById('viewerContainer') as HTMLElement
        // set positions before and after clicking to viewerHistory
        set(container.scrollTop)
        setTimeout(() => { set(container.scrollTop) }, 500)
    }

    ;(document.getElementById('viewerContainer') as HTMLElement).addEventListener('click', setHistory)
    ;(document.getElementById('sidebarContainer') as HTMLElement).addEventListener('click', setHistory)

    // back button (mostly useful for the embedded viewer)
    ;(document.getElementById('historyBack') as HTMLElement).addEventListener('click', () => { back() })
    ;(document.getElementById('historyForward') as HTMLElement).addEventListener('click', () => { forward() })

    document.addEventListener('mousedown', (ev) => {
        if(ev.button === 3) { back() }
        if(ev.button === 4) { forward() }
    })
}

export const scrollHistory = {
    set,
    back,
    forward
}

function set(scroll: number, force = false) {
    if (history.length === 0) {
        history.push({scroll, temporary: false})
        currentIndex = 0
        return
    }

    if (currentIndex === undefined) {
        console.log('currentIndex === undefined never happens here.')
        return
    }

    const curScroll = history[currentIndex].scroll
    if (curScroll !== scroll || force) {
        history = history.slice(0, currentIndex + 1)
        const last = history[history.length-1]
        if (last) {
            last.temporary = false
        }
        history.push({scroll, temporary: false})
        if (history.length > 30) {
            history = history.slice(history.length - 30)
        }
        currentIndex = history.length - 1
    }
}

function back() {
    if (history.length === 0) {
        return
    }
    const container = document.getElementById('viewerContainer') as HTMLElement
    let cur = currentIndex
    if (cur === undefined) {
        return
    }
    let prevScroll = history[cur].scroll
    if (history.length > 0 && prevScroll !== container.scrollTop) {
        if (currentIndex === history.length - 1) {
            const last = history[history.length-1]
            if (last.temporary) {
                last.scroll = container.scrollTop
                cur = cur - 1
                prevScroll = history[cur].scroll
            } else {
                const tmp = {scroll: container.scrollTop, temporary: true}
                history.push(tmp)
            }
        }
    }
    if (prevScroll !== container.scrollTop) {
        currentIndex = cur
        container.scrollTop = prevScroll
    } else {
        if (cur === 0) {
            return
        }
        const scroll = history[cur-1].scroll
        currentIndex = cur - 1
        container.scrollTop = scroll
    }
}

function forward() {
    if (currentIndex === history.length - 1) {
        return
    }
    const container = document.getElementById('viewerContainer') as HTMLElement
    const cur = currentIndex
    if (cur === undefined) {
        return
    }
    const nextScroll = history[cur+1].scroll
    if (nextScroll !== container.scrollTop) {
        currentIndex = cur + 1
        container.scrollTop = nextScroll
    } else {
        if (cur >= history.length - 2) {
            return
        }
        const scroll = history[cur+2].scroll
        currentIndex = cur + 2
        container.scrollTop = scroll
    }
}
