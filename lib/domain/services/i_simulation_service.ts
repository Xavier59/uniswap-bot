import { TransactionFailure } from "../failures/transaction_failure";
import { BuiltTransactionReadyToSend } from "../value_types/built_transaction";
import { RawTransaction } from "../value_types/raw_transaction";
import { TransactionPairReserves } from "../value_types/transaction_pair_reserves";

export interface ISimulationService {

    /**
     * Used to send (often replay usecases) transactions.
     * @param {RawTransaction} tx - The raw transaction that triggered the bot.
     * @returns TransactionError if transaction failed.
     */
    sendRawTransaction(
        tx: RawTransaction
    ): Promise<void | TransactionFailure>;

    /**
     * Used to send built transactions.
     * @param {BuiltTransactionReadyToSend} tx - The transaction built and signed.
     * @returns TransactionError if transaction failed.
     */
    sendBuiltTransaction(
        tx: BuiltTransactionReadyToSend,
    ): Promise<void | TransactionFailure>;

    getSimulationReserves(
        reserveIn: string,
        reserveOut: string
    ): Promise<TransactionPairReserves>;

    getSimulationBalance(): Promise<string>;
}   