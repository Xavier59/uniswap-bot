import { ISimulationService } from "../services/i_simulation_service";
import { BuiltTransactionReadyToSend } from "../value_types/built_transaction";
import { RawTransaction } from "../value_types/raw_transaction";
import { TransactionPairReserves } from "../value_types/transaction_pair_reserves";


export class SimulationBox {

    #transactions: Array<BuiltTransactionReadyToSend | RawTransaction>;
    #simulationService: ISimulationService;

    constructor(
        txs: Array<BuiltTransactionReadyToSend | RawTransaction>,
        simulationService: ISimulationService
    ) {
        this.#simulationService = simulationService;
        this.#transactions = txs;
    }

    async simulate(): Promise<void> {
        this.#transactions.forEach(async tx => {
            if (typeof tx === "string") {
                await this.#simulationService.sendRawTransaction(tx);
            } else {
                await this.#simulationService.sendBuiltTransaction(tx);
            }
        });
    }

    async getSimulationReserves(
        reserveIn: string,
        reserveOut: string
    ): Promise<TransactionPairReserves> {
        return this.#simulationService.getSimulationReserves(reserveIn, reserveOut);
    }

    async getBalance(): Promise<string> {
        return this.#simulationService.getSimulationBalance();
    }

}