import Web3 from "web3";
import { Transaction } from "web3-eth"
import { Contract } from "web3-eth-contract"
import { UNISWAP_FACTORY_ADDR } from "../../config";
import { TransactionFailure } from "../../domain/failures/transaction_failure";
import { ITransactionService } from "../../domain/services/i_transaction_service";
import { BuiltTransactionReadyToSend } from "../../domain/value_types/built_transaction";
import { RawTransaction } from "../../domain/value_types/raw_transaction";
import { TransactionPairReserves } from "../../domain/value_types/transaction_pair_reserves";

export class TransactionService implements ITransactionService {

    #web3: Web3;
    #customContract: Contract;

    #gasPrice: string;
    #currentNonce: number;
    #blockNumber: number;

    constructor(
        web3: Web3,
        customContract: Contract,
    ) {
        this.#web3 = web3;
        this.#customContract = customContract;

        this.#gasPrice = "";
        this.#currentNonce = 0;
        this.#blockNumber = 0;

        // Maybe store for clearInterval ?
        setInterval(async () => {
            this.#gasPrice = await this._fetchGasPrice();
        }, 10000);

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
        this.#blockNumber = await this._fetchBlockNumber();
    }

    async sendRawTransaction(
        tx: RawTransaction
    ): Promise<void> {
        try {
            await this.#web3.eth.sendSignedTransaction(tx);
        } catch (error) {
            throw new TransactionFailure("RAW_TX", error);
        }
    }

    async sendBuiltTransaction(
        tx: BuiltTransactionReadyToSend,
    ): Promise<void> {
        let params = {
            ...tx.sendParams,
            data: (tx.transaction as any).encodeABI(),
        };

        try {
            let signedTransaction = await this.#web3.eth.accounts.signTransaction(
                params,
                process.env.ETH_PRIVATE_KEY!
            );
            await this.#web3.eth.sendSignedTransaction(signedTransaction.rawTransaction!);
        } catch (error) {
            throw new TransactionFailure((tx.transaction as any)._method.name, error);
        }
    }

    getCurrentNonce(): number {
        return this.#currentNonce;
    }

    getBlockNumber(): number {
        return this.#blockNumber;
    }

    setBlockNumber(blockNumber: number): void {
        this.#blockNumber = blockNumber;
    }

    convertToEth(
        wei: string
    ): string {
        return this.#web3.utils.fromWei(wei);
    }

    private async _fetchBlockNumber(): Promise<number> {
        return await this.#web3.eth.getBlockNumber();
    }

    async fetchBalance(): Promise<string> {
        return await this.#web3.eth.getBalance(process.env.ETH_PUBLIC_KEY!);
    }

    private async _fetchGasPrice(): Promise<string> {
        return await this.#web3.eth.getGasPrice();
    }

    private async _fetchNonce(): Promise<number> {
        return await this.#web3.eth.getTransactionCount(process.env.ETH_PUBLIC_KEY!) - 1;
    }

    async getTransactionFromHash(
        txHash: string
    ): Promise<Transaction> {
        return await this.#web3.eth.getTransaction(txHash);
    }

    async getRawTransactionFromHash(
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

    async updateNonce(): Promise<void> {
        this.#currentNonce = await this._fetchNonce();
    }

}