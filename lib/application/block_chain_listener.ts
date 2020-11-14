import Web3 from "web3";
import { Subscription } from "web3-core-subscriptions";
import { ILoggerService } from "../domain/services/i_logger_service";
import { ITransactionService } from "../domain/services/i_transaction_service";
import { ITransactionMiddleware } from "./middlewares/i_transaction_middleware";
import { BlockHeader } from "web3-eth";

export class BlockChainListener {

    #txService: ITransactionService;
    #txMiddlewareBus: ITransactionMiddleware;
    #pendingTransactions: Subscription<string>;
    #newBlocks: Subscription<BlockHeader>;
    #logger: ILoggerService;

    constructor(
        web3: Web3,
        txMiddlewareBus: ITransactionMiddleware,
        txService: ITransactionService,
        logger: ILoggerService
    ) {
        this.#txMiddlewareBus = txMiddlewareBus;
        this.#txService = txService;
        this.#logger = logger;
        this.#pendingTransactions = web3.eth.subscribe("pendingTransactions");
        this.#newBlocks = web3.eth.subscribe("newBlockHeaders");
    }

    startListening(): void {
        this.#pendingTransactions
            .on("data", async (txHash: string) => {
                const tx = await this.#txService.getTransactionFromHash(txHash);
                if (tx == null) {
                    this.#logger.addErrorForTx(txHash, `Error while fetching the tx for ${txHash}`, 0);
                } else {
                    this.#logger.addDebugForTx(txHash, `Transaction ${txHash} received`, 0);
                    await this.#txMiddlewareBus.dispatch(tx);
                    this.#logger.consumeLogsForTx(tx.hash);
                }
            })
            .on("error", (err: Object) => {
                this.#logger.logGeneralInfo(`Error in pending transactions subscription listener : ${err}`);
            });
        this.#logger.logGeneralInfo("Subscribed to pending tx");

        this.#newBlocks
            .on("data", async (blockHead) => {
                this.#txService.setBlockNumber(blockHead.number);
            })
            .on("error", (err: Object) => {
                this.#logger.logGeneralInfo(`Error in new block subscription listener : ${err}`);
            });
        this.#logger.logGeneralInfo("Subscribed to new blocks");
    }

    stopListening(): void {
        this.#pendingTransactions.unsubscribe((err, res) => {
            if (res) this.#logger.logGeneralInfo("Unsubscribed to pending tx");
        });
    }
}
