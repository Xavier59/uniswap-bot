import { Transaction as Web3_Transaction } from "web3-eth";
import { ITransactionMiddleware } from "./i_transaction_middleware";
import { ILoggerService } from "../../domain/services/i_logger_service";
import { ParsedTransactionMethod } from "../../domain/value_types/parsed_transaction_method";

export class AddDecodedMethodToTxMiddleware extends ITransactionMiddleware {

    #abiDecoder: any;

    constructor(
        logger: ILoggerService,
        abiDecoder: any
    ) {
        super(logger);
        this.#abiDecoder = abiDecoder;
    }

    async dispatch(
        tx: Web3_Transaction
    ): Promise<boolean> {
        // Decode uniswap contract methods
        let txMethod: ParsedTransactionMethod = this.#abiDecoder.decodeMethod(tx.input);
        if (!txMethod) {
            this.logger.addErrorForTx(tx.hash, `Failed to decode transaction ${tx.hash}`, 1);
            return false;
        }

        // Add decoded data to tx to not need to decode again in the bot or services
        tx["decodedMethod"] = txMethod;
        return await this.next!.dispatch(tx);


    }

}