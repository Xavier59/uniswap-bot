import { ITxMiddleware } from "./i_tx_middleware";

export class TxMiddlewareBusBuilder {
    #txMiddlewareBus: ITxMiddleware | null

    constructor() {
        this.#txMiddlewareBus = null;
    }

    pushTxMiddleware(txMiddleware: ITxMiddleware): TxMiddlewareBusBuilder {
        if(this.#txMiddlewareBus === null) {
            this.#txMiddlewareBus = txMiddleware;
        } else {
            txMiddleware.setNext(this.#txMiddlewareBus);
            this.#txMiddlewareBus = txMiddleware;
        }
        return this;
    }

    build(): ITxMiddleware {
        return this.#txMiddlewareBus!;
    }
}