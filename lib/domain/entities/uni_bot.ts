import { Transaction } from "web3-eth"
import { ILoggerService } from "../services/i_logger_service";
import { ITransactionService } from "../services/i_transaction_service";
import { RawTransaction } from "../value_types/raw_transaction";
import { TransactionMethod } from "../value_types/transaction_method";
import { TransactionPairReserves } from "../value_types/transaction_pair_reserves";
import BN from "bignumber.js";
import { SimulationBoxBuilder } from "../../infrastructure/factories/simulation_builder";

export class UniBot {

    #txService: ITransactionService;
    #logger: ILoggerService;
    #nodeUrl: string;
    #uniswapFactoryAddr: string;
    #customUniswapABI: Object;
    #customUniswapAddr: string;


    constructor(txService: ITransactionService, logger: ILoggerService, nodeUrl: string, uniswapFactoryAddr: string, customUniswapABI: any, customUniswapAddr: string) {
        this.#txService = txService;
        this.#logger = logger;
        this.#nodeUrl = nodeUrl;
        this.#uniswapFactoryAddr = uniswapFactoryAddr;
        this.#customUniswapABI = customUniswapABI;
        this.#customUniswapAddr = customUniswapAddr;
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

        let priceImpact = reserveOutAfter.minus(reserveOutBefore).div(reserveOutBefore).times(100);
        this.#logger.addDebugForTx(tx.hash, `Reserve impact: ${priceImpact} %`, 1);

        // Simulate attack sandwich


        // Replay in real
    }

    private async _getReserve(reserveIn: string, reserveOut: string): Promise<TransactionPairReserves> {
        return await this.#txService.getReserve(reserveIn, reserveOut);
    }

    private async _getReserveAfterVictimTx(tx: RawTransaction, reserveIn: string, reserveOut: string): Promise<TransactionPairReserves> {
        let simulationBox = new SimulationBoxBuilder(this.#nodeUrl, this.#uniswapFactoryAddr, this.#customUniswapABI, this.#customUniswapAddr).addTx(tx).build();
        await simulationBox.simulate();
        return await simulationBox.getSimulationReserves(reserveIn, reserveOut);
    }

}