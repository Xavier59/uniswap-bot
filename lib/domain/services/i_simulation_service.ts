import { TransactionFailure } from "../failures/transaction_failure";
import { BuiltTransactionReadyToSend } from "../value_types/built_transaction";
import { RawTransaction } from "../value_types/raw_transaction";
import { TransactionPairReserves } from "../value_types/transaction_pair_reserves";

export interface ISimulationService {

    // Initialize the object before use
    // Used to add methods to web3Ganache
    init(): void;

    /**
     * Used to push (often replay usecases) raw transactions to ganache tx pool.
     * @param {RawTransaction} tx - The raw transaction that triggered the bot.
     * @throws TransactionError if transaction failed.
     */
    addRawTransactionToPool(
        tx: RawTransaction
    ): Promise<string>;

    /**
     * Used to push built transactions to ganache tx pool.
     * @param {BuiltTransactionReadyToSend} tx - The transaction built and signed.
     * @throws TransactionError if transaction failed.
     */
    addBuiltTransactionToPool(
        tx: BuiltTransactionReadyToSend,
    ): Promise<string>;

    /**
     * Force ganache to mine block in tx pool .
     * @param {BuiltTransactionReadyToSend} tx - The transaction built and signed.
     * @throws TransactionError if transaction failed.
     */
    forceBlockToBeMined(): Promise<void>;

    getSimulationReserves(
        reserveIn: string,
        reserveOut: string
    ): Promise<TransactionPairReserves>;

    getSimulationBalance(): Promise<string>;
}   