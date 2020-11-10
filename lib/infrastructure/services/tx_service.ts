import BN from "bn.js";
import Web3 from "web3";
import { Transaction } from "web3-eth"
import { Contract } from "web3-eth-contract"
import { ITxService } from "../../domain/services/i_tx_service";
import { TxPairReserves } from "../../domain/value_types/type";

export class TxService implements ITxService {

    #web3: Web3;
    #uniswapFactoryAddr: string;
    #customContract: Contract;
    #gasPrice: string;

    constructor(web3: Web3, customContract: Contract, uniswapFactoryAddr: string) {
        this.#web3 = web3;
        this.#uniswapFactoryAddr = uniswapFactoryAddr;
        this.#customContract = customContract;

        this.#gasPrice = "";

        // Maybe store for clearInterval ?
        setInterval(async () => {
            this.#gasPrice = await this._fetchGasPrice();
            console.log("New gasPrice : " + this.#gasPrice);
        }, 10000);
    }

    async init(): Promise<void> {
        this.#gasPrice = await this._fetchGasPrice();
    }

    convertToEth(wei: string): string {
        return this.#web3.utils.fromWei(wei);
    }

    private async _fetchGasPrice(): Promise<string> {
        return await this.#web3.eth.getGasPrice();
    }

    async getTxFromHash(txHash: string): Promise<Transaction> {
        return await this.#web3.eth.getTransaction(txHash);
    }

    async getReserve(reserveIn: string, reserveOut: string): Promise<TxPairReserves> {
        return await this.#customContract.methods.getReserves(this.#uniswapFactoryAddr, reserveIn, reserveOut).call();
    }

    getGasPrice(): string {
        return this.#gasPrice;
    }

    getEthPrice(): Promise<BN> {
        throw new Error("Method not implemented.");
    }

}