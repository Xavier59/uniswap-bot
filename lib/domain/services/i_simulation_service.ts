import { Transaction } from "web3-eth"
import { SimulationFailure } from "../failures/simulation_failure";
import { SimulationOutput } from "../value_types/simulation_output";
import { RawTransaction } from "../value_types/raw_transaction";
import { TransactionPairReserves } from "../value_types/transaction_pair_reserves";

export interface ISimulationService {

    getSimulationReserves(reserveIn: string, reserveOut: string): Promise<TransactionPairReserves>;

    simulateTransaction(tx: Transaction | RawTransaction): Promise<void>;

}   