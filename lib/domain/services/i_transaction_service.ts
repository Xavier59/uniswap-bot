import { Transaction } from "web3-eth"
import BN from "bn.js";
import { TransactionPairReserves } from "../value_types/transaction_pair_reserves";
import { RawTransaction } from "../value_types/raw_transaction";
import { TransactionFailure } from "../failures/transaction_failure";
import { BuiltTransactionReadyToSend } from "../value_types/built_transaction";

export interface ITransactionService {

    // Initialize the object before use
    // Mainly initiate gasPrice, nonce, blockNumber
    init(): Promise<void>;

    // Convert wei to ETH
    convertToEth(
        wei: string
    ): string;

    // Return previously fetched gas price
    getGasPrice(): string;

    // Return previously fetched nonce
    getCurrentNonce(): number;

    // Return previously fetched nonce
    updateNonce(): Promise<void>;

    // Return the current block numbr
    getBlockNumber(): number;

    // Return the current block numbr
    setBlockNumber(blockNumber: number): void;

    // Return the associated reserve from the tokens pair addresses
    getReserve(
        reserveInAddr: string,
        reserveOutAddr: string
    ): Promise<TransactionPairReserves>;

    // Return a tx from its hash
    getTransactionFromHash(
        txHash: string
    ): Promise<Transaction>;

    // Return a raw transaction from its hash
    getRawTransactionFromHash(
        txHash: string
    ): Promise<any>;

    fetchBalance(): Promise<string>;

    /**
    * Used to send (often replay usecases) transactions.
    * @param {RawTransaction} tx - The raw transaction that triggered the bot.
    * @throws TransactionError if transaction failed.
    */
    sendRawTransaction(
        tx: RawTransaction
    ): Promise<void>;

    /**
     * Used to send built transactions.
     * @param {BuiltTransactionReadyToSend} tx - The transaction built and signed.
     * @throws TransactionError if transaction failed.
     */
    sendBuiltTransaction(
        tx: BuiltTransactionReadyToSend,
    ): Promise<void>;
}