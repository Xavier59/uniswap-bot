import { Transaction } from "web3-eth";
import { ITransactionMiddleware } from "./i_transaction_middleware";
import { ILoggerService } from "../../domain/services/i_logger_service";

export class FilterNonUniswapTxMiddleware extends ITransactionMiddleware {

    #uniswapAddr: string;

    constructor(logger: ILoggerService, uniswapAddr: string) {
        super(logger);
        this.#uniswapAddr = uniswapAddr;
    }

    async dispatch(tx: Transaction): Promise<boolean> {

        // Filter only uniswap transactions
        if (tx.to === null || tx.to.toLowerCase() !== this.#uniswapAddr) {
            this.logger.addErrorForTx(tx.hash, `Transaction ${tx.hash} is not for uniswap`, 1);
            return false;
        }

        return await this.next!.dispatch(tx);
    }

}