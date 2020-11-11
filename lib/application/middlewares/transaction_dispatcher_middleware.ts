import { Transaction as Web3_Transaction } from "web3-eth";
import { ITransactionMiddleware } from "./i_transaction_middleware";
import { ILoggerService } from "../../domain/services/i_logger_service";
import { UniBot } from "../../domain/entities/uni_bot";

export class TransactionDispatecherMiddleware extends ITransactionMiddleware {

    #uniBot: UniBot;

    constructor(
        logger: ILoggerService,
        uniBot: UniBot
    ) {
        super(logger);
        this.#uniBot = uniBot;
    }

    async dispatch(
        tx: Web3_Transaction
    ): Promise<boolean> {
        this.logger.addSuccessFortx(tx.hash, "Dispatching tx to unibot", 1);
        await this.#uniBot.processTx(tx);
        return true;

    }

}