import { Transaction } from "web3-eth"
import BN from "bn.js";
import { TxPairReserves } from "../value_types/type";

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
    getReserve(reserveIn: string, reserveOut: string): Promise<TxPairReserves>;

    // Return a tx from its hash
    getTxFromHash(txHash: string): Promise<Transaction>;
}