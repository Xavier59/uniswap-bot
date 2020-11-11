import { Transaction } from "web3-eth";
import { ITransactionMiddleware } from "./i_transaction_middleware";
import { ILoggerService } from "../../domain/services/i_logger_service";
import BN from "bn.js";
import { ITransactionService } from "../../domain/services/i_transaction_service";

export class FilterOldTxMiddleware extends ITransactionMiddleware {

    #txService: ITransactionService;

    constructor(logger: ILoggerService, txService: ITransactionService) {
        super(logger);
        this.#txService = txService;
    }

    async dispatch(tx: Transaction): Promise<boolean> {
        let txGasPrice = new BN(tx.gasPrice);
        // Filter low gasprice tx (tx that are pending for a long time...)

        let minGasPrice = await this.#txService.getGasPrice();
        if (txGasPrice.lt(new BN(minGasPrice))) {
            this.logger.addErrorForTx(tx.hash, `Filter old pending transaction ${tx.hash}`, 1);
            return false;
        }


        return await this.next!.dispatch(tx);

    }

}