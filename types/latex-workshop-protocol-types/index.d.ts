
type SynctexData = {
    page: number;
    x: number;
    y: number;
    indicator: boolean;
}

type SynctexRangeData = SynctexData & {
    h: number;
    v: number;
    W: number;
    H: number;
}

export type ServerResponse = {
    type: 'refresh'
} | {
    type: 'synctex',
    data: SynctexData | SynctexRangeData[]
} | {
    type: 'reload'
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
            backgroundColor: string,
            pageBorderColor: string
        },
        dark: {
            pageColorsForeground: string,
            pageColorsBackground: string,
            backgroundColor: string,
            pageBorderColor: string
        }
    },
    codeColorTheme: 'light' | 'dark',
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
    type: 'external_link',
    url: string
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
} | {
    type: 'copy',
    content: string,
    isMetaKey: boolean
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
    sidebarView?: number,
    trim?: number,
    scrollMode?: number,
    spreadMode?: number,
    synctexEnabled?: boolean,
    autoReloadEnabled?: boolean
}
