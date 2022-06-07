function promisePair<T>() {
    let resolve: ((value: T | PromiseLike<T>) => void) = () => {}
    const promise = new Promise<T>((r) => {
        resolve = r
    })
    return {promise, resolve}
}

export class ExternalPromise<T> {
    private readonly promisePair = promisePair<T>()
    #isResolved = false

    resolve(value: T) {
        this.#isResolved = true
        this.promisePair.resolve(value)
    }

    get promise(): Promise<T> {
        return this.promisePair.promise
    }

    get isResolved(): boolean {
        return this.#isResolved
    }

}
