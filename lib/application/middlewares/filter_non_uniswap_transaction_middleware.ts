import { Transaction as Web3_Transaction } from "web3-eth";
import { ITransactionMiddleware } from "./i_transaction_middleware";
import { ILoggerService } from "../../domain/services/i_logger_service";
import { UNISWAP_CONTRACT_ADDR } from "../../config";

export class FilterNonUniswapTxMiddleware extends ITransactionMiddleware {


    constructor(
        logger: ILoggerService,
    ) {
        super(logger);
    }

    async dispatch(
        tx: Web3_Transaction
    ): Promise<boolean> {

        // Filter only uniswap transactions
        if (tx.to === null || tx.to.toLowerCase() !== UNISWAP_CONTRACT_ADDR) {
            this.logger.addDebugForTx(tx.hash, `Transaction ${tx.hash} is not for uniswap`, 1);
            return false;
        }

        return await this.next!.dispatch(tx);
    }

}