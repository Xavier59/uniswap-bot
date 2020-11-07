import {Transaction} from "web3-eth"
import BN from "bn.js";
import { TxPairReserves } from "../value_types/type";

export interface ITxService {
    convertToEth(wei: string): string;
    getGasPrice(): Promise<string>;
    getEthPrice(): Promise<BN>;
    getReserve(reserveIn: string, reserveOut: string): Promise<TxPairReserves>;
    getTxFromHash(txHash: string): Promise<Transaction>;
}