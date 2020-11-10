import { Transaction } from "web3-eth";
import { ITxMiddleware } from "./i_tx_middleware";
import { ILogger } from "../../domain/services/i_logger";
import BN from "bn.js";
import { ITxService } from "../../domain/services/i_tx_service";

export class FilterOldTxMiddleware extends ITxMiddleware {

    #txService: ITxService;

    constructor(logger: ILogger, txService: ITxService) {
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