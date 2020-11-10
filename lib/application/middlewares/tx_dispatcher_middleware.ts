import { Transaction } from "web3-eth";
import { ITxMiddleware } from "./i_tx_middleware";
import { ILoggerService } from "../../domain/services/i_logger_service";
import BN from "bignumber.js";
import { UniBot } from "../../domain/entities/uni_bot";

export class TxDispatecherMiddleware extends ITxMiddleware {

    #uniBot: UniBot;

    constructor(logger: ILoggerService, uniBot: UniBot) {
        super(logger);
        this.#uniBot = uniBot;
    }

    async dispatch(tx: Transaction): Promise<boolean> {
        this.logger.addSuccessFortx(tx.hash, "Dispatching tx to unibot", 1);
        await this.#uniBot.processTx(tx);
        return true;

    }

}