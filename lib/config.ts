import BN from "bignumber.js";
export const PRIVATE_NODE = `ws://${process.env.NODE_IP}:${process.env.NODE_PORT}`;
export const UNISWAP_FACTORY_ADDR = "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f"
export const UNISWAP_CONTRACT_ADDR: string = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";
export const CUSTOM_CONTRACT_ADDR: string = "0x00a1d1443b5d910c86a52ebfd6fbb9da8e31a48d";

export const MAX_ETH_INVEST = new BN("500000000000000000"); // 0.5 ETH
export const MAX_GAS_PRICE = new BN("50000000000"); // 0.00000005 ETH

export const GANACHE_OPTIONS = {
    "total_accounts": 1,
    "fork": PRIVATE_NODE
};

// const transactionMethods: Array<String> = ["swapExactETHForTokens", "swapTokensForExactETH", "swapExactTokensForETH", "swapETHForExactTokens"];
export const TRANSACTION_METHODS: Array<String> = ["swapExactETHForTokens"];

export const LOGGER_OPTIONS = {
    "logTxError": true,
    "logTxInfo": true,
    "logTxDebug": false,
    "logTxSuccess": true,
    "logGeneralInfo": false,
};

