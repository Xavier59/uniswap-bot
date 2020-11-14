import { Transaction as Web3_Transaction } from "web3-eth";
import { ITransactionMiddleware } from "./i_transaction_middleware";
import { ILoggerService } from "../../domain/services/i_logger_service";
import BN from "bignumber.js";
import { MAX_GAS_PRICE } from "../../config";

export class FilterGasPriceToHighMiddleware extends ITransactionMiddleware {

    constructor(
        logger: ILoggerService,
    ) {
        super(logger);
    }

    async dispatch(
        tx: Web3_Transaction
    ): Promise<boolean> {

        if (new BN(tx.gasPrice).gt(MAX_GAS_PRICE)) {
            this.logger.addDebugForTx(tx.hash, `Transaction ${tx.hash} has to much gas price`, 1);
            return false;
        }

        return await this.next!.dispatch(tx);
    }

}