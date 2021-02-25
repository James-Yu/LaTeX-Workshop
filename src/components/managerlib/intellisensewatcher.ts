import * as events from 'events'

export class IntellisenseWatcher {
    private readonly intellisenseEmitter: events.EventEmitter
    private readonly cbSet: Set<(file: string) => void> = new Set()

    constructor() {
        this.intellisenseEmitter = new events.EventEmitter()
        this.intellisenseEmitter.on('update', (file: string) => {
            this.cbSet.forEach((cb) => {
                cb(file)
            })
        })
    }

    onDidUpdateIntellisense(cb: (file: string) => void) {
        this.cbSet.add(cb)
        const diposable = {
            dipose: () => { this.cbSet.delete(cb) }
        }
        return diposable
    }

    emitUpdate(file: string) {
        this.intellisenseEmitter.emit('update', file)
    }

}
