import Web3 from "web3";
import ganache from "ganache-core";
import { SimulationBox } from "../../domain/entities/simulation_box";
import { ISimulationBoxBuilder as ISimulationBoxBuilder } from "../../domain/factories/i_simulation_box_builder";
import { RawTransaction } from "../../domain/value_types/raw_transaction";
import { SimulationService } from "../services/simulation_service";
import { BuiltTransactionReadyToSend } from "../../domain/value_types/built_transaction";
import { CUSTOM_CONTRACT_ADDR, GANACHE_OPTIONS, UNISWAP_FACTORY_ADDR } from "../../config";


export class SimulationBoxBuilder implements ISimulationBoxBuilder {

    #txList: Array<BuiltTransactionReadyToSend | RawTransaction>;
    #customUniswapABI: string;

    constructor(
        customUniswapABI: string,
    ) {
        this.#txList = new Array();
        this.#customUniswapABI = customUniswapABI;
    }

    copy(): ISimulationBoxBuilder {
        return new SimulationBoxBuilder(
            this.#customUniswapABI,
        );
    }

    addTx(
        tx: BuiltTransactionReadyToSend | RawTransaction
    ): ISimulationBoxBuilder {
        this.#txList.push(tx);
        return this;
    }

    build(): SimulationBox {
        const web3Ganache = new Web3(ganache.provider(GANACHE_OPTIONS) as any);
        const customContract = new web3Ganache.eth.Contract(this.#customUniswapABI as any, CUSTOM_CONTRACT_ADDR);
        const simulationService = new SimulationService(web3Ganache, UNISWAP_FACTORY_ADDR, customContract);
        simulationService.init();
        return new SimulationBox(this.#txList, simulationService);
    }

}