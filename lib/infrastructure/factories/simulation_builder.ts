import Web3 from "web3";
import { Transaction } from "web3-eth";
import ganache from "ganache-core";
import { SimulationBox } from "../../domain/entities/simulation_box";
import { ISimulationBoxBuilder as ISimulationBoxBuilder } from "../../domain/factories/i_simulation_box_builder";
import { RawTransaction } from "../../domain/value_types/raw_transaction";
import { SimulationService } from "../services/simulation_service";
import { Contract } from "web3-eth-contract";


export class SimulationBoxBuilder implements ISimulationBoxBuilder {

    #ganacheOptions: Object;
    #txList: Array<Transaction | RawTransaction>;
    #uniswapFactoryAddr: string;
    #customUniswapABI: any;
    #customUniswapAddr: string;

    constructor(nodeUrl: string, uniswapFactoryAddr: string, customUniswapABI: any, customUniswapAddr: string) {
        this.#ganacheOptions = {
            "total_accounts": 1,
            "fork": nodeUrl
        };
        this.#txList = new Array();
        this.#uniswapFactoryAddr = uniswapFactoryAddr;
        this.#customUniswapABI = customUniswapABI;
        this.#customUniswapAddr = customUniswapAddr;
    }

    addTx(tx: Transaction | RawTransaction): ISimulationBoxBuilder {
        this.#txList.push(tx);
        return this;
    }

    build(): SimulationBox {
        let web3Ganache = new Web3(ganache.provider(this.#ganacheOptions) as any);
        let customContract = new web3Ganache.eth.Contract(this.#customUniswapABI, this.#customUniswapAddr);
        let simulationService = new SimulationService(web3Ganache, this.#uniswapFactoryAddr, customContract);
        return new SimulationBox(this.#txList, simulationService);
    }

}