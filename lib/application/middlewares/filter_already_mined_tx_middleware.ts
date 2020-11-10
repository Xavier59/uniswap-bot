import { Transaction } from "web3-eth";
import { ITxMiddleware } from "./i_tx_middleware";
import { ILoggerService } from "../../domain/services/i_logger_service";

export class FilterAlreadyMinedTxMiddleware extends ITxMiddleware {

    constructor(logger: ILoggerService) {
        super(logger);
    }

    async dispatch(tx: Transaction): Promise<boolean> {

        // Filter already mined transactions
        if (tx.blockNumber !== null) {
            this.logger.addErrorForTx(tx.hash, `Transaction ${tx.hash} has already been mined`, 1);
            return false;
        }

        return await this.next!.dispatch(tx);

    }

}