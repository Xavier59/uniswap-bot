import { Transaction } from "web3-eth"
import { ISimulationBoxBuilder } from "../factories/i_simulation_box_builder";
import { ILoggerService } from "../services/i_logger_service";
import { ITxService } from "../services/i_tx_service";
import { RawTransaction } from "../value_types/raw_transaction";
import { TransactionMethod } from "../value_types/transaction_method";
import { TransactionPairReserves } from "../value_types/transaction_pair_reserves";
import BN from "bn.js";

export class UniBot {

    #txService: ITxService;
    #logger: ILoggerService;
    #simulationBoxBuilder: ISimulationBoxBuilder;

    constructor(txService: ITxService, simulationBoxBuilder: ISimulationBoxBuilder, logger: ILoggerService) {
        this.#txService = txService;
        this.#logger = logger;
        this.#simulationBoxBuilder = simulationBoxBuilder;
    }

    async processTx(tx: Transaction) {
        this.#logger.addInfoForTx(tx.hash, `Tx ${tx.hash} received by the bot`, 1);

        // Call get reserve custom amoutIn amoutOut
        let txMethod: TransactionMethod = tx["decodedMethod"];
        let path = txMethod.params.find(txParam => txParam.name == "path")!.value;
        this.#logger.addDebugForTx(tx.hash, `Path: ${JSON.stringify(path)}`, 1);

        // Compute price impact
        let reserveBeforeVictimTx = await this._getReserve(path[0], path[1]);
        let rawTx = await this.#txService.getRawTxFromHash(tx.hash);
        let reserveAfterVictimTx = await this._getReserveAfterVictimTx(rawTx, path[0], path[1]);
        this.#logger.addDebugForTx(tx.hash, `RESERVE BEFORE: ${reserveBeforeVictimTx.reserveA};${reserveBeforeVictimTx.reserveB}`, 1);
        this.#logger.addDebugForTx(tx.hash, `RESERVE BEFORE: ${reserveAfterVictimTx.reserveA};${reserveAfterVictimTx.reserveB}`, 1);

        let reserveOutBefore = new BN(reserveBeforeVictimTx.reserveB);
        let reserveOutAfter = new BN(reserveAfterVictimTx.reserveB);

        let priceImpact = reserveOutAfter.sub(reserveOutBefore).div(reserveOutBefore).muln(100);
        this.#logger.addDebugForTx(tx.hash, `PRICE IMPACT: ${priceImpact}`, 1);


        // Simulate attack sandwich

    }

    private async _getReserve(reserveIn: string, reserveOut: string): Promise<TransactionPairReserves> {
        return await this.#txService.getReserve(reserveIn, reserveOut);
    }

    private async _getReserveAfterVictimTx(tx: RawTransaction, reserveIn: string, reserveOut: string): Promise<TransactionPairReserves> {
        let simulationBox = this.#simulationBoxBuilder.addTx(tx).build();
        await simulationBox.simulate();
        return await simulationBox.getSimulationReserves(reserveIn, reserveOut);
    }

}