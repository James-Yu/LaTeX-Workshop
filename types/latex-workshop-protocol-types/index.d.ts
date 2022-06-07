export type ServerResponse = {
    type: 'refresh'
} | {
    type: 'synctex',
    data: {
        page: number,
        x: number,
        y: number
    }
}

export type PdfViewerParams = {
    scale: string,
    trim: number,
    scrollMode: number,
    spreadMode: number,
    hand: boolean,
    invertMode: {
        enabled: boolean,
        brightness: number,
        grayscale: number,
        hueRotate: number,
        invert: number,
        sepia: number
    },
    color: {
        light: {
            pageColorsForeground: string,
            pageColorsBackground: string,
            backgroundColor: string
        },
        dark: {
            pageColorsForeground: string,
            pageColorsBackground: string,
            backgroundColor: string
        }
    }
    keybindings: {
        synctex: 'ctrl-click' | 'double-click'
    }
}

export type ClientRequest = {
    type: 'open',
    pdfFileUri: string,
    viewer: 'browser' | 'tab'
} | {
    type: 'loaded',
    pdfFileUri: string
} | {
    type: 'ping'
} | {
    type: 'reverse_synctex',
    pdfFileUri: string,
    pos: [number, number],
    page: number,
    textBeforeSelection: string,
    textAfterSelection: string
} | {
    type: 'add_log',
    message: string
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
    kind?: 'not_stored',
    path?: string,
    pdfFileUri?: string,
    scale?: string,
    scrollTop?: number,
    scrollLeft?: number,
    trim?: number,
    scrollMode?: number,
    spreadMode?: number,
    synctexEnabled?: boolean,
    autoReloadEnabled?: boolean
}
