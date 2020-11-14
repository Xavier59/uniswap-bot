import { Transaction as Web3_Transaction } from "web3-eth";
import { ITransactionMiddleware } from "./i_transaction_middleware";
import { ILoggerService } from "../../domain/services/i_logger_service";
import { ITokenService } from "../../domain/services/i_token_service";
import { ParsedTransactionMethod } from "../../domain/value_types/parsed_transaction_method";

export class FilterBlockListedTokensMiddleware extends ITransactionMiddleware {

    #tokenService: ITokenService;

    constructor(
        logger: ILoggerService,
        tokenService: ITokenService
    ) {
        super(logger);
        this.#tokenService = tokenService;
    }

    async dispatch(
        tx: Web3_Transaction
    ): Promise<boolean> {

        const txMethod: ParsedTransactionMethod = tx["decodedMethod"];
        let path = txMethod.params.find(txParam => txParam.name == "path")!.value as String;

        for (const token of path) {
            const isBlockListed = await this.#tokenService.isBlocklisted(token);
            if (isBlockListed) {
                this.logger.addDebugForTx(tx.hash, `Filter blocklisted token ${tx.hash}`, 1);
                return false;
            }
        }
        return await this.next!.dispatch(tx);
    }

}