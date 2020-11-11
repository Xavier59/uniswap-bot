import { SimulationBox } from "../entities/simulation_box";
import { BuiltTransactionReadyToSend } from "../value_types/built_transaction";
import { RawTransaction } from "../value_types/raw_transaction";

export interface ISimulationBoxBuilder {
    copy(): ISimulationBoxBuilder;

    addTx(
        tx: BuiltTransactionReadyToSend | RawTransaction
    ): ISimulationBoxBuilder;

    build(): SimulationBox;
}



