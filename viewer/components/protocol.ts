export type ServerResponse = {
    type: 'refresh'
} | {
    type: 'request_state'
} | {
    type: 'params',
    scale: string,
    trim: number,
    scrollMode: number,
    spreadMode: number,
    hand: boolean,
    invertMode: {
        brightness: number,
        grayscale: number,
        hueRotate: number,
        invert: number,
        sepia: number,
        darkModeOnly: boolean
    },
    bgColor: string,
    keybindings: {
        synctex: 'ctrl-click' | 'double-click'
    }
} | {
    type: 'synctex',
    data: {
        page: number,
        x: number,
        y: number
    }
}

export type ClientRequest = {
    type: 'open',
    path: string,
    viewer: 'browser' | 'tab'
} | {
    type: 'request_params',
    path: string
} | {
    type: 'loaded',
    path: string
} | {
    type: 'external_link',
    url: string
} | {
    type: 'ping'
} | {
    type: 'state',
    path: string,
    scrollTop: number
} | {
    type: 'reverse_synctex',
    path: string,
    pos: [number, number],
    page: number,
    textBeforeSelection: string,
    textAfterSelection: string
}

export type PanelManagerResponse = {
    type: 'restore_state',
    state: PdfViewerState
}

export type PanelRequest = {
    type: 'initialized'
} | {
    type: 'keyboard_event',
    event: any
} | {
    type: 'state',
    state: PdfViewerState
}

export type PdfViewerState = {
    path?: string,
    scale?: string,
    scrollTop?: number,
    scrollLeft?: number,
    trim?: number,
    scrollMode?: number,
    spreadMode?: number
}
