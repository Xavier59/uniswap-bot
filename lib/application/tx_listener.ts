import Web3 from "web3";
import { Subscription } from "web3-core-subscriptions";

import { ILogger } from "../domain/services/i_logger";
import { ITxService } from "../domain/services/i_tx_service";
import { ITxMiddleware } from "./middlewares/i_tx_middleware";

export class TxListener {

    #txService: ITxService;
    #txMiddlewareBus: ITxMiddleware;
    #sub: Subscription<string>;
    #logger: ILogger;

    constructor(web3: Web3, txMiddlewareBus: ITxMiddleware, txService: ITxService, logger: ILogger) {
        this.#txMiddlewareBus = txMiddlewareBus;
        this.#sub = web3.eth.subscribe("pendingTransactions");
        this.#txService = txService;
        this.#logger = logger;
    }

    startListening(): void {
        this.#logger.logGeneralInfo("Subscribed to pending tx");
        this.#sub
        .on("data", async (txHash: string) => {
            const tx = await this.#txService.getTxFromHash(txHash);
            if (tx == null) {
                this.#logger.addErrorForTx(txHash, `Error while fetching the tx for ${txHash}`, 0);
            } else {
                this.#logger.addInfoForTx(txHash, `Transaction ${txHash} received`, 0);
                await this.#txMiddlewareBus.dispatch(tx);
                this.#logger.showLogsForTx(tx.hash);
            }
        })
        .on("error", (err: Object) => {
            this.#logger.logGeneralInfo(`Error in tx subscription listener : ${err}`);
        })
    }

    stopListening(): void {
        this.#sub.unsubscribe((err, res) => {
            if (res) this.#logger.logGeneralInfo("Unsubscribed to pending tx");
        });
    }
}

