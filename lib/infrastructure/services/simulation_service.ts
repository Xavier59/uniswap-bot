import { Transaction } from "web3-eth";
import Web3 from "web3";
import { SimulationFailure } from "../../domain/failures/simulation_failure";
import { ISimulationService } from "../../domain/services/i_simulation_service";
import { SimulationOutput } from "../../domain/value_types/simulation_output";
import { RawTransaction } from "../../domain/value_types/raw_transaction";
import { TransactionPairReserves } from "../../domain/value_types/transaction_pair_reserves";
import { Contract } from "web3-eth-contract"

export class SimulationService implements ISimulationService {

    #web3Ganache: Web3;
    #customContract: Contract;
    #uniswapFactoryAddr: string;

    constructor(web3Ganache: Web3, uniswapFactoryAddr: string, customContract: Contract) {
        this.#web3Ganache = web3Ganache;
        this.#uniswapFactoryAddr = uniswapFactoryAddr;
        this.#customContract = customContract;
    }

    async getSimulationReserves(reserveIn: string, reserveOut: string): Promise<TransactionPairReserves> {
        return await this.#customContract.methods.getReserves(this.#uniswapFactoryAddr, reserveIn, reserveOut).call();
    }

    async simulateTransaction(tx: Transaction | RawTransaction): Promise<void> {
        if (typeof tx === "string") {
            await this.#web3Ganache.eth.sendSignedTransaction(tx);
        } else {

        }

    }


}