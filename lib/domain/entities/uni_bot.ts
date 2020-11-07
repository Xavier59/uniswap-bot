import {Transaction} from "web3-eth"
import { ILogger } from "../services/i_logger";
import { ITxService } from "../services/i_tx_service";
import { TxMethod, TxPairReserves } from "../value_types/type";

export class UniBot {

    #txService: ITxService;
    #logger: ILogger;
 
    constructor(txService: ITxService, logger: ILogger) {
        this.#txService = txService;
        this.#logger = logger;
    }

    async processTx(tx: Transaction) {
        this.#logger.addInfoForTx(tx.hash, `Tx ${tx.hash} received by the bot`, 1);
        
        // Call get reserve custom amoutIn amoutOut
        let txMethod: TxMethod = tx["decodedMethod"];
        let path = txMethod.params.find(txParam => txParam.name == "path")!.value;
        this.#logger.addDebugForTx(tx.hash, `Path: ${JSON.stringify(path)}`, 1);

        let reserves = await this._getReserve(path[0], path[1]);
        let reserveIn = this.#txService.convertToEth(reserves.reserveA);
        let reservOut = this.#txService.convertToEth(reserves.reserveB);
        this.#logger.addDebugForTx(tx.hash, `Fetched reserves ${reserveIn} : ${reservOut}`, 1);

        // Calculer le profit computeMaxProfit/computeMaxProfitForAmount
        //  - Ce qu'on a fait hier
        
        
        // Attack sandwich

    }

    private async _getReserve(reserveIn: string, reserveOut: string): Promise<TxPairReserves> {
        return await this.#txService.getReserve(reserveIn, reserveOut);
    }

}