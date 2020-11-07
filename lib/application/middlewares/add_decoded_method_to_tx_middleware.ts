import { Transaction } from "web3-eth";
import { ITxMiddleware } from "./i_tx_middleware";
import { ILogger } from "../../domain/services/i_logger";
import { TxMethod } from "../../domain/value_types/type";

export class AddDecodedMethodToTxMiddleware extends ITxMiddleware {

    #abiDecoder: any;

    constructor(logger: ILogger, abiDecoder: any) {
        super(logger);
        this.#abiDecoder = abiDecoder;
    }

    async dispatch(tx: Transaction): Promise<boolean> {
        // Decode uniswap contract methods
        let txMethod: TxMethod = this.#abiDecoder.decodeMethod(tx.input);
        if (!txMethod) {
            this.logger.addErrorForTx(tx.hash, `Failed to decode transaction ${tx.hash}`, 1);
            return false;
        }

        // Add decoded data to tx to not need to decode again in the bot or services
        tx["decodedMethod"] = txMethod;
        return await this.next!.dispatch(tx);


    }

}