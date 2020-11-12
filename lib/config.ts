export const PRIVATE_NODE = `ws://${process.env.NODE_IP}:${process.env.NODE_PORT}`;

export const GANACHE_OPTIONS = {
    "total_accounts": 1,
    "fork": PRIVATE_NODE
};
export const UNISWAP_FACTORY_ADDR = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"
export const UNISWAP_CONTRACT_ADDR: string = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";
export const CUSTOM_CONTRACT_ADDR: string = "0x1a9Cf3237266cfc034A710Fa7ACF89b4c325bFB7";

// const transactionMethods: Array<String> = ["swapExactETHForTokens", "swapTokensForExactETH", "swapExactTokensForETH", "swapETHForExactTokens"];
export const TRANSACTION_METHODS: Array<String> = ["swapExactETHForTokens"];

export const LOGGER_OPTIONS = {
    "logTxError": false,
    "logTxInfo": false,
    "logTxDebug": true,
    "logTxSuccess": true,
    "logGeneralInfo": true,
};

export const MAX_ETH_INVEST = "500000000000000000" // 0,5 ETH