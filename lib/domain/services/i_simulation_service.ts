import { BuiltTransactionReadyToSend } from "../value_types/built_transaction";
import { RawTransaction } from "../value_types/raw_transaction";
import { TransactionPairReserves } from "../value_types/transaction_pair_reserves";

export interface ISimulationService {

    sendRawTransaction(
        tx: RawTransaction
    ): Promise<void>;

    sendBuiltTransaction(
        tx: BuiltTransactionReadyToSend,
    ): Promise<void>;

    getSimulationReserves(
        reserveIn: string,
        reserveOut: string
    ): Promise<TransactionPairReserves>;

    getSimulationBalance(): Promise<string>;
}   