import Web3 from "web3";
import { ISimulationService } from "../../domain/services/i_simulation_service";
import { RawTransaction } from "../../domain/value_types/raw_transaction";
import { TransactionPairReserves } from "../../domain/value_types/transaction_pair_reserves";
import { Contract } from "web3-eth-contract"
import { BuiltTransactionReadyToSend } from "../../domain/value_types/built_transaction";
import { TransactionFailure } from "../../domain/failures/transaction_failure";
import { ILoggerService } from "../../domain/services/i_logger_service";

export class SimulationService implements ISimulationService {

    #web3Ganache: Web3;

    // Attributes used to call our cutom getReserves method
    #customContract: Contract;
    #uniswapFactoryAddr: string;

    constructor(
        web3Ganache: Web3,
        uniswapFactoryAddr: string,
        customContract: Contract,
    ) {
        this.#web3Ganache = web3Ganache;
        this.#uniswapFactoryAddr = uniswapFactoryAddr;
        this.#customContract = customContract;
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

    async getSimulationBalance(): Promise<string> {
        return await this.#web3Ganache.eth.getBalance(process.env.ETH_PUBLIC_KEY!);
    }

    async sendRawTransaction(
        tx: RawTransaction
    ): Promise<void> {
        try {
            await this.#web3Ganache.eth.sendSignedTransaction(tx);
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
            let signedTransaction = await this.#web3Ganache.eth.accounts.signTransaction(
                params,
                process.env.ETH_PRIVATE_KEY!
            );
            await this.#web3Ganache.eth.sendSignedTransaction(signedTransaction.rawTransaction!);
        } catch (error) {
            throw new TransactionFailure((tx.transaction as any)._method.name, error);
        }
    }

}