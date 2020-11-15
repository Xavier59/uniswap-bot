import Web3 from "web3";
import { ISimulationService } from "../../domain/services/i_simulation_service";
import { RawTransaction } from "../../domain/value_types/raw_transaction";
import { TransactionPairReserves } from "../../domain/value_types/transaction_pair_reserves";
import { Contract } from "web3-eth-contract"
import { BuiltTransactionReadyToSend } from "../../domain/value_types/built_transaction";
import { TransactionFailure } from "../../domain/failures/transaction_failure";

export class SimulationService implements ISimulationService {

    #web3Ganache: Web3;

    // Attributes used to call our cutom getReserves method
    #customContract: Contract;
    #uniswapFactoryAddr: string;

    #txErrosWhenMinedBlock: Array<TransactionFailure>;

    constructor(
        web3Ganache: Web3,
        uniswapFactoryAddr: string,
        customContract: Contract,
    ) {
        this.#web3Ganache = web3Ganache;
        this.#uniswapFactoryAddr = uniswapFactoryAddr;
        this.#customContract = customContract;
        this.#txErrosWhenMinedBlock = [];
    }

    init(): void {
        this.#web3Ganache.eth.extend({
            methods: [{
                name: "mine",
                call: "evm_mine",
            }]
        });
    }

    async getSimulationReserves(
        tokenA: string,
        tokenB: string
    ): Promise<TransactionPairReserves> {
        return await this.#customContract.methods.getReserves(
            this.#uniswapFactoryAddr,
            tokenA,
            tokenB
        ).call();
    }

    async forceBlockToBeMined(): Promise<void> {
        await this.#web3Ganache.eth["mine"]();

        if (this.#txErrosWhenMinedBlock.length > 0) {
            throw this.#txErrosWhenMinedBlock[0];
        }
    }

    async getSimulationBalance(): Promise<string> {
        return await this.#web3Ganache.eth.getBalance(process.env.ETH_PUBLIC_KEY!);
    }

    async addRawTransactionToPool(
        tx: RawTransaction
    ): Promise<string> {

        return new Promise(async (resolve, reject) => {
            try {
                await this.#web3Ganache.eth.sendSignedTransaction(tx)
                    .on("transactionHash", (hash) => {
                        resolve(hash);
                    })
            } catch (error) {
                const txFailure = new TransactionFailure("RAW_TX", error);
                this.#txErrosWhenMinedBlock.push(txFailure);
            }
        });
    }

    async addBuiltTransactionToPool(
        tx: BuiltTransactionReadyToSend,
    ): Promise<string> {

        const params = {
            ...tx.sendParams,
            data: (tx.transaction as any).encodeABI(),
        };

        try {
            const signedTransaction = await this.#web3Ganache.eth.accounts.signTransaction(
                params,
                process.env.ETH_PRIVATE_KEY!
            );

            return new Promise(async (resolve, reject) => {
                try {
                    await this.#web3Ganache.eth.sendSignedTransaction(signedTransaction.rawTransaction!)
                        .on("transactionHash", (hash) => {
                            resolve(hash);
                        })
                } catch (error) {

                    const txFailure = new TransactionFailure((tx.transaction as any)._method.name, error);
                    this.#txErrosWhenMinedBlock.push(txFailure);
                }
            });

        } catch (error) {
            throw new TransactionFailure((tx.transaction as any)._method.name, error);
        }

    }

}