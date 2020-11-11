import { Transaction } from "web3-eth";
import { ITransactionMiddleware } from "./i_transaction_middleware";
import { ILoggerService } from "../../domain/services/i_logger_service";
import { TransactionMethod } from "../../domain/value_types/transaction_method";

export class FilterUniswapTxMethodsMiddleware extends ITransactionMiddleware {

    #txMethods: Array<String>;

    constructor(logger: ILoggerService, txMethods: Array<String>) {
        super(logger);
        this.#txMethods = txMethods;
    }

    async dispatch(tx: Transaction): Promise<boolean> {

        // check if we monitor the decoded tx method
        let txMethod: TransactionMethod = tx["decodedMethod"]
        if (this.#txMethods.includes(txMethod.name)) {

            // Only select pair transaction so that eth => btc => sushi won't be monitored for example
            let path = txMethod.params.find(txParam => txParam.name == "path")!.value;
            if (path.length == 2) {
                this.logger.addSuccessFortx(tx.hash, `Transaction ${tx.hash} is a pair from ${path[0]} to ${path[1]} `, 1);
                return await this.next!.dispatch(tx);
            }
            this.logger.addErrorForTx(tx.hash, `Transaction ${tx.hash} is not a pair, abandon`, 1)

        } else {
            this.logger.addErrorForTx(tx.hash, `Targeted method not found for ${tx.hash}`, 1);
        }

        return false;
    }

}