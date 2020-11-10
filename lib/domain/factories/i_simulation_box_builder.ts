import { Transaction } from "web3-eth";
import { SimulationBox } from "../entities/simulation_box";
import { ISimulationService } from "../services/i_simulation_service";
import { RawTransaction } from "../value_types/raw_transaction";

export interface ISimulationBoxBuilder {
    addTx(tx: Transaction | RawTransaction): ISimulationBoxBuilder;
    build(): SimulationBox;
}



