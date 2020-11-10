import Web3 from "web3";
import { readFileSync } from "fs";
import abiDecoder from "abi-decoder";

import { TxListener } from "./application/tx_listener";
import { TxService } from "./infrastructure/services/tx_service";
import { UniBot } from "./domain/entities/uni_bot"
import { ConsoleLogger } from "./infrastructure/services/console_logger";
import { TxMiddlewareBusBuilder } from "./application/middlewares/middleware_bus";
import { TxDispatecherMiddleware as TxDispatcherMiddleware } from "./application/middlewares/tx_dispatcher_middleware";
import { FilterNonUniswapTxMiddleware } from "./application/middlewares/filter_non_uniswap_tx_middleware";
import { FilterOldTxMiddleware } from "./application/middlewares/filter_old_tx_middleware";
import { FilterUniswapTxMethodsMiddleware } from "./application/middlewares/filter_uniswap_tx_methods_middleware";
import { FilterAlreadyMinedTxMiddleware } from "./application/middlewares/filter_already_mined_tx_middleware";
import { AddDecodedMethodToTxMiddleware } from "./application/middlewares/add_decoded_method_to_tx_middleware";

const privateNode: string = 'ws://86.192.162.56:8546/'

const uniswapAddr: string = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";
const uniswapABI = JSON.parse(readFileSync("./abi/UniswapV2Router02.abi.json").toString());
abiDecoder.addABI(uniswapABI);

const customUniswapAddr: string = "0x1a9Cf3237266cfc034A710Fa7ACF89b4c325bFB7";
const customUniswapABI = JSON.parse(readFileSync("./abi/CustomUniswap.abi.json").toString());
abiDecoder.addABI(customUniswapABI);

const uniswapFactoryAddr = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"

const web3 = new Web3(new Web3.providers.WebsocketProvider(privateNode));
const customContract = new web3.eth.Contract(customUniswapABI, customUniswapAddr);

const transactionMethods: Array<String> = ["swapExactETHForTokens", "swapTokensForExactETH", "swapExactTokensForETH", "swapETHForExactTokens"];

const loggerOption = {
    "logTxError": false,
    "logTxInfo": false,
    "logTxDebug": false,
    "logTxSuccess": false,
    "logGeneralInfo": false,
}

async function main() {

    // Basic logger for the bot
    let logger = new ConsoleLogger();
    logger.configure(loggerOption);

    // Create a tx service class that implement utilities methods
    // used by several part of the application
    let txService = new TxService(web3, customContract, uniswapFactoryAddr);
    await txService.init();

    // Create the bot that will dictate the main business decision rules
    let uniBot = new UniBot(txService, logger);

    // Create the tx filter to only forwar interesting tx to the bot
    let txMiddlewareBus = new TxMiddlewareBusBuilder()
        .pushTxMiddleware(new TxDispatcherMiddleware(logger, uniBot))
        .pushTxMiddleware(new FilterUniswapTxMethodsMiddleware(logger, transactionMethods))
        .pushTxMiddleware(new AddDecodedMethodToTxMiddleware(logger, abiDecoder))
        .pushTxMiddleware(new FilterOldTxMiddleware(logger, txService))
        .pushTxMiddleware(new FilterAlreadyMinedTxMiddleware(logger))
        .pushTxMiddleware(new FilterNonUniswapTxMiddleware(logger, uniswapAddr))
        .build();

    // Create a listener to notify the bot about incoming tx
    let txListener = new TxListener(web3, txMiddlewareBus, txService, logger);

    txListener.startListening();
}

main();