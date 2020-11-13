export class TransactionFailure {

    #txMethod: string;
    #error: any;

    constructor(
        txMethod: string,
        error: any
    ) {
        this.#txMethod = txMethod;
        this.#error = error;
    }

    getMethod(): string {
        return this.#txMethod;
    }

    getError(): any {
        return this.#error;
    }

    toString(): string {
        return `${this.#txMethod}: ${this.#error.results ? this.#error.results[this.#error.hashes[0]].reason : this.#error} `;
    }
}