import {Cacher} from './cache'

export class AuxCacher extends Cacher<any> {

    /**
     * We don't parse non-tex-like-or-bib files.
     */
    parse(_: string): any {
        return {}
    }
}
