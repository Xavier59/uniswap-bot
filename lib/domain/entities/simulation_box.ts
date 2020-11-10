import { Transaction } from "web3-eth";
import { SimulationFailure } from "../failures/simulation_failure";
import { ISimulationService } from "../services/i_simulation_service";
import { SimulationOutput } from "../value_types/simulation_output";
import { RawTransaction } from "../value_types/raw_transaction";
import { TransactionPairReserves } from "../value_types/transaction_pair_reserves";


export class SimulationBox {

    // Fork
    // Approval ?
    // Réinsérer notre tx
    // Réinsérer sa tx
    // Réinsérer notre 2e tx

    // Check si on a bien récupérer notre argent

    #transactions: Array<Transaction | RawTransaction>;
    #simulationService: ISimulationService;

    constructor(txs: Array<Transaction | RawTransaction>, simulationService: ISimulationService) {
        this.#simulationService = simulationService;
        this.#transactions = txs;
    }

    async simulate(): Promise<void> {
        this.#transactions.forEach(async tx => {
            await this.#simulationService.simulateTransaction(tx);
        });
    }

    async getSimulationReserves(reserveIn: string, reserveOut: string): Promise<TransactionPairReserves> {
        return this.#simulationService.getSimulationReserves(reserveIn, reserveOut);
    }


}