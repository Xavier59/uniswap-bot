import { Transaction } from "web3-eth";
import { ITxMiddleware } from "./i_tx_middleware";
import { ILogger } from "../../domain/services/i_logger";
import BN from "bignumber.js";
import { UniBot } from "../../domain/entities/uni_bot";

export class TxDispatecherMiddleware extends ITxMiddleware {

    #uniBot: UniBot;

    constructor(logger: ILogger, uniBot: UniBot) {
        super( logger);
        this.#uniBot = uniBot;
    }

    async dispatch(tx: Transaction): Promise<boolean> {
       this.logger.addSuccessFortx(tx.hash, "Dispatching tx to unibot", 1);
       await this.#uniBot.processTx(tx);
       return true;

    }

}