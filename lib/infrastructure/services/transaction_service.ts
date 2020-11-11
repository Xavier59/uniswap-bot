import BN from "bn.js";
import Web3 from "web3";
import { Transaction } from "web3-eth"
import { Contract } from "web3-eth-contract"
import { UNISWAP_FACTORY_ADDR } from "../../config";
import { ITransactionService } from "../../domain/services/i_transaction_service";
import { RawTransaction } from "../../domain/value_types/raw_transaction";
import { TransactionPairReserves } from "../../domain/value_types/transaction_pair_reserves";

export class TransactionService implements ITransactionService {

    #web3: Web3;
    #customContract: Contract;
    #gasPrice: string;

    #currentNonce: number;
    #walletAddr: string;

    constructor(
        web3: Web3,
        customContract: Contract,
        walletAddr: string
    ) {
        this.#web3 = web3;
        this.#customContract = customContract;

        this.#gasPrice = "";
        this.#currentNonce = 1;
        this.#walletAddr = walletAddr;

        // Maybe store for clearInterval ?
        setInterval(async () => {
            this.#gasPrice = await this._fetchGasPrice();
        }, 10000);

    }

    getCurrentNonce(): number {
        return this.#currentNonce;
    }

    async init(): Promise<void> {
        this.#web3.eth.extend({
            methods: [{
                name: "getRawTransaction",
                call: "eth_getRawTransactionByHash",
                params: 1
            }]
        });
        this.#gasPrice = await this._fetchGasPrice();
        this.#currentNonce = await this._fetchNonce();
    }

    convertToEth(
        wei: string
    ): string {
        return this.#web3.utils.fromWei(wei);
    }

    private async _fetchGasPrice(): Promise<string> {
        return await this.#web3.eth.getGasPrice();
    }

    private async _fetchNonce(): Promise<number> {
        return await this.#web3.eth.getTransactionCount(this.#walletAddr) - 1;
    }

    async getTxFromHash(
        txHash: string
    ): Promise<Transaction> {
        return await this.#web3.eth.getTransaction(txHash);
    }

    async getRawTxFromHash(
        txHash: string
    ): Promise<RawTransaction> {
        return await this.#web3.eth["getRawTransaction"](txHash);
    }

    async getReserve(
        reserveIn: string,
        reserveOut: string
    ): Promise<TransactionPairReserves> {
        return await this.#customContract.methods.getReserves(
            UNISWAP_FACTORY_ADDR,
            reserveIn,
            reserveOut
        ).call();
    }

    getGasPrice(): string {
        return this.#gasPrice;
    }

}