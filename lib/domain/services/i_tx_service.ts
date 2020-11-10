import { Transaction } from "web3-eth"
import BN from "bn.js";
import { TransactionPairReserves } from "../value_types/transaction_pair_reserves";

export interface ITxService {

    // Convert wei to ETH
    convertToEth(wei: string): string;

    // Initialize the object before use
    // Mainly initiate gasPrice
    init(): Promise<void>;

    // Return previously fetched gas price
    getGasPrice(): string;

    // TODO
    getEthPrice(): Promise<BN>;

    // Return the associated reserve from the tokens pair addresses
    getReserve(reserveIn: string, reserveOut: string): Promise<TransactionPairReserves>;

    // Return a tx from its hash
    getTxFromHash(txHash: string): Promise<Transaction>;

    // Return a raw transaction from its hash
    getRawTxFromHash(txHash: string): Promise<any>;
}