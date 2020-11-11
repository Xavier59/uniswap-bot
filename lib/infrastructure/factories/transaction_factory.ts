import Web3 from "web3";
import { Contract } from "web3-eth-contract"
import { UNISWAP_CONTRACT_ADDR } from "../../config";
import { ERC20Methods, ITransactionFactory, TransactionType, UniswapMethods } from "../../domain/factories/i_transaction_factory";
import { BuiltTransaction, BuiltTransactionMethodParams } from "../../domain/value_types/built_transaction";

export class TransactionFactory implements ITransactionFactory {

    #web3MainNet: Web3;
    #web3Ganache: Web3;

    #mainNetUniswapContract: Contract;
    #ganacheUniswapContract: Contract;

    #ERC20Abi: Object;

    constructor(
        web3MainNet: Web3,
        web3Ganache: Web3,
        uniswapAbi: any,
        ERC20Abi: any
    ) {

        // Need ths because we don't know the token contract before 
        // receiving the victim tx so we need to instanciate one for 
        // each tx to create
        this.#web3MainNet = web3MainNet;
        this.#web3Ganache = web3Ganache;
        this.#ERC20Abi = ERC20Abi;

        // Since we can perrsist uniswap contract, save for instancianting new contract for each tx
        this.#mainNetUniswapContract = new web3MainNet.eth.Contract(uniswapAbi, UNISWAP_CONTRACT_ADDR);
        this.#ganacheUniswapContract = new web3Ganache.eth.Contract(uniswapAbi, UNISWAP_CONTRACT_ADDR);
    }

    createErc20Transaction(
        txType: TransactionType,
        tokenContractAddr: string,
        method: ERC20Methods,
        methodParams: BuiltTransactionMethodParams
    ): BuiltTransaction {
        let ERC20Contract: Contract;

        switch (txType) {
            case TransactionType.onMainNet:
                ERC20Contract = new this.#web3MainNet.eth.Contract(this.#ERC20Abi as any, tokenContractAddr);
                break;

            case TransactionType.onGanache:
                ERC20Contract = new this.#web3Ganache.eth.Contract(this.#ERC20Abi as any, tokenContractAddr);
                break;

            default:
                ERC20Contract = new this.#web3Ganache.eth.Contract(this.#ERC20Abi as any, tokenContractAddr);
                break;
        }

        let tx = ERC20Contract.methods[method](...methodParams);
        return tx;
    }

    createUniswapTransaction(
        txType: TransactionType,
        method: UniswapMethods,
        methodParams: BuiltTransactionMethodParams
    ): BuiltTransaction {

        let uniswapContract: Contract;

        switch (txType) {
            case TransactionType.onMainNet:
                uniswapContract = this.#mainNetUniswapContract;
                break;

            case TransactionType.onGanache:
                uniswapContract = this.#ganacheUniswapContract;
                break;

            default:
                uniswapContract = this.#ganacheUniswapContract;
                break;
        }

        let tx = uniswapContract.methods[method](...methodParams);
        return tx;
    }

}