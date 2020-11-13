import { TransactionFailure } from "../failures/transaction_failure";
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

    async simulate(): Promise<void | TransactionFailure> {
        let txs: Promise<void | TransactionFailure>[] = [];

        this.#transactions.forEach(async tx => {
            if (typeof tx === "string") {
                txs.push(this.#simulationService.sendRawTransaction(tx));
            } else {
                txs.push(this.#simulationService.sendBuiltTransaction(tx));
            }
        });

        try {
            await Promise.all(txs)
        } catch (txFailure) {
            return txFailure;
        }

    }

    async getSimulationReserves(
        tokenA: string,
        tokenB: string
    ): Promise<TransactionPairReserves> {
        return this.#simulationService.getSimulationReserves(tokenA, tokenB);
    }

    async getBalance(): Promise<string> {
        return this.#simulationService.getSimulationBalance();
    }

}