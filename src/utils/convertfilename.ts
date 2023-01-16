import * as fs from 'fs'
import * as iconv from 'iconv-lite'

// https://github.com/ashtuchkin/iconv-lite/wiki/Supported-Encodings
export const iconvLiteSupportedEncodings = [
    'utf8', 'utf16le', 'UTF-16BE', 'UTF-16',
    'Shift_JIS', 'Windows-31j', 'Windows932', 'EUC-JP',
    'GB2312', 'GBK', 'GB18030', 'Windows936', 'EUC-CN',
    'KS_C_5601', 'Windows949', 'EUC-KR',
    'Big5', 'Big5-HKSCS', 'Windows950',
    'windows-874', 'windows-1250', 'windows-1251', 'windows-1252',
    'windows-1253', 'windows-1254', 'windows-1255', 'windows-1256',
    'windows-1257', 'windows-1258',
    'ISO-8859-1', 'ISO-8859-2', 'ISO-8859-3', 'ISO-8859-4', 'ISO-8859-5',
    'ISO-8859-6', 'ISO-8859-7', 'ISO-8859-8', 'ISO-8859-9', 'ISO-8859-10',
    'ISO-8859-11', 'ISO-8859-13', 'ISO-8859-14', 'ISO-8859-15', 'ISO-8859-16',
    'CP437', 'CP737', 'CP775',
    'CP850', 'CP852', 'CP855', 'CP856', 'CP857', 'CP858',
    'CP860', 'CP861', 'CP862', 'CP863', 'CP864', 'CP865', 'CP866', 'CP869',
    'CP922', 'CP1046', 'CP1124', 'CP1125', 'CP1129', 'CP1133', 'CP1161', 'CP1162', 'CP1163',
    'koi8-r', 'koi8-u', 'koi8-ru', 'koi8-t'
]

export function convertFilenameEncoding(filePath: string): string | undefined {
    for (const enc of iconvLiteSupportedEncodings) {
        try {
            const fpath = iconv.decode(Buffer.from(filePath, 'binary'), enc)
            if (fs.existsSync(fpath)) {
                return fpath
            }
        } catch (e) {

        }
    }
    return
}
