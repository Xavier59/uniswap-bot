import { BuiltTransaction, BuiltTransactionMethodParams } from "../value_types/built_transaction";

export enum TransactionType {
    onMainNet,
    onGanache,
}

export enum ERC20Methods {
    approve = "approve"
}

export enum UniswapMethods {
    swapETHForExactTokens = "swapETHForExactTokens",
    swapExactTokensForETH = "swapExactTokensForETH",
}

export interface ITransactionFactory {
    createErc20Transaction(
        txType: TransactionType,
        tokenContractAddr: string,
        method: ERC20Methods,
        methodParams: BuiltTransactionMethodParams,
    ): BuiltTransaction;

    createUniswapTransaction(
        txType: TransactionType,
        method: UniswapMethods,
        methodParams: BuiltTransactionMethodParams
    ): BuiltTransaction;
}