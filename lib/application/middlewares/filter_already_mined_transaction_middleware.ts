import { Transaction as Web3_Transaction } from "web3-eth";
import { ITransactionMiddleware } from "./i_transaction_middleware";
import { ILoggerService } from "../../domain/services/i_logger_service";

export class FilterAlreadyMinedTxMiddleware extends ITransactionMiddleware {

    constructor(
        logger: ILoggerService
    ) {
        super(logger);
    }

    async dispatch(
        tx: Web3_Transaction
    ): Promise<boolean> {

        // Filter already mined transactions
        if (tx.blockNumber !== null) {
            this.logger.addErrorForTx(tx.hash, `Transaction ${tx.hash} has already been mined`, 1);
            return false;
        }

        return await this.next!.dispatch(tx);

    }

}