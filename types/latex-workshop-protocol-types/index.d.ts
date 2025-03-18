
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
    type: 'refresh',
    pdfFileUri: string
} | {
    type: 'synctex',
    data: SynctexData | SynctexRangeData[]
} | {
    type: 'synctex_result',
    pdfFile: string, // vsls scheme
    synctexData: SynctexData | SynctexRangeData
} | {
    type: 'reverse_synctex_result',
    input: string, // input file path, in vsls scheme
    line: number,
    column: number,
    textBeforeSelection: string,
    textAfterSelection: string
} | {
    type: 'reload'
}

export type PdfViewerParams = {
    toolbar: number,
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
    },
    reloadTransition: 'none' | 'fade'
}

export type ClientRequest = {
    type: 'open',
    pdfFileUri: string
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
} | {
    type: 'synctex',
    line: number,
    column: number,
    filePath: string,
    targetPdfFile: string,
    indicator: 'none' | 'circle' | 'rectangle'
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
