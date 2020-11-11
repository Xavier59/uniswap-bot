import { ITransactionMiddleware } from "./i_transaction_middleware";

export class TransactionMiddlewareBusBuilder {
    #txMiddlewareBus: ITransactionMiddleware | null

    constructor() {
        this.#txMiddlewareBus = null;
    }

    pushTxMiddleware(
        txMiddleware: ITransactionMiddleware
    ): TransactionMiddlewareBusBuilder {
        if (this.#txMiddlewareBus === null) {
            this.#txMiddlewareBus = txMiddleware;
        } else {
            txMiddleware.setNext(this.#txMiddlewareBus);
            this.#txMiddlewareBus = txMiddleware;
        }
        return this;
    }

    build(): ITransactionMiddleware {
        return this.#txMiddlewareBus!;
    }
}