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

        const sentTxs: Array<Promise<string>> = [];

        for (let i = 0; i < this.#transactions.length; i++) {
            try {
                if (typeof this.#transactions[i] === "string") {
                    sentTxs.push(this.#simulationService.addRawTransactionToPool(this.#transactions[i] as string));
                } else {
                    sentTxs.push(this.#simulationService.addBuiltTransactionToPool(this.#transactions[i] as BuiltTransactionReadyToSend));
                }

                await this.#simulationService.forceBlockToBeMined();

            } catch (txFailure) {
                return txFailure;
            }
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