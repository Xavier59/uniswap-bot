import Web3 from "web3";
import ganache from "ganache-core";
import { readFileSync } from "fs";
import abiDecoder from "abi-decoder";

import dotenv from "dotenv";
dotenv.config();

import { TransactionService } from "./infrastructure/services/transaction_service";
import { UniBot } from "./domain/entities/uni_bot"
import { ConsoleLogger } from "./infrastructure/services/console_logger";
import { TransactionMiddlewareBusBuilder } from "./application/middlewares/middleware_bus";
import { TransactionDispatecherMiddleware } from "./application/middlewares/transaction_dispatcher_middleware";
import { FilterNonUniswapTransactionMiddleware } from "./application/middlewares/filter_non_uniswap_transaction_middleware";
import { FilterOldTxMiddleware } from "./application/middlewares/filter_old_transaction_middleware";
import { FilterUniswapTxMethodsMiddleware } from "./application/middlewares/filter_uniswap_transaction_methods_middleware";
import { FilterAlreadyMinedTxMiddleware } from "./application/middlewares/filter_already_mined_transaction_middleware";
import { AddDecodedMethodToTxMiddleware } from "./application/middlewares/add_decoded_method_to_transaction_middleware";
import { TransactionFactory } from "./infrastructure/factories/transaction_factory";
import { SimulationBoxBuilder } from "./infrastructure/factories/simulation_box_builder";
import { CUSTOM_CONTRACT_ADDR, LOGGER_OPTIONS, PRIVATE_NODE } from "./config";
import Database from "./infrastructure/services/database";
import { TokenService } from "./infrastructure/services/token_service";
import { FilterBlockListedTokensMiddleware } from "./application/middlewares/filter_blocklisted_tokens_middleware";
import { BlockChainListener } from "./application/block_chain_listener";


const uniswapABI = JSON.parse(readFileSync("./abi/UniswapV2Router02.abi.json").toString());
abiDecoder.addABI(uniswapABI);

const customUniswapABI = JSON.parse(readFileSync("./abi/CustomUniswap.abi.json").toString());
abiDecoder.addABI(customUniswapABI);

const ERC20ABI = JSON.parse(readFileSync("./abi/ERC20.abi.json").toString());

const web3MainNet = new Web3(new Web3.providers.WebsocketProvider(PRIVATE_NODE));
const customMainNetContract = new web3MainNet.eth.Contract(customUniswapABI, CUSTOM_CONTRACT_ADDR);

const web3Ganache = new Web3(ganache.provider() as any);

async function main() {

    // Basic logger for the bot
    const logger = new ConsoleLogger();
    logger.configure(LOGGER_OPTIONS);

    // connect to database
    try {
        await Database.connectDatabase(`mongodb://${process.env.MONGO_IP}:${process.env.MONGO_PORT}/`, process.env.DBNAME);
    } catch (e) {
        logger.logGeneralInfo(`Couldn't connect to database, got error : ${e}`);
        return;
    }

    // Create a tx factory class that allows for simple
    // transaction creation on mainet and ganache
    const txFactory = new TransactionFactory(
        web3MainNet,
        web3Ganache,
        uniswapABI,
        ERC20ABI
    );

    // Create a tx service class that implement utilities methods
    // used by several part of the application
    const txService = new TransactionService(
        web3MainNet,
        customMainNetContract,
    );
    await txService.init();

    // Create a tx service class that implement utilities methods
    // used by several part of the application
    const tokenService = new TokenService();

    // Create a token service to give the bot possibility to 
    // check for trusted token, approve them etc.
    const simulationBoxBuilder = new SimulationBoxBuilder(
        customUniswapABI,
    );

    // Create the bot that will dictate the main business decision rules
    const uniBot = new UniBot(
        logger,
        txService,
        tokenService,
        txFactory,
        simulationBoxBuilder,
    );

    // Create the tx filter to only forwar interesting tx to the bot
    const txMiddlewareBus = new TransactionMiddlewareBusBuilder()
        .pushTxMiddleware(new TransactionDispatecherMiddleware(logger, uniBot))
        .pushTxMiddleware(new FilterBlockListedTokensMiddleware(logger, tokenService))
        .pushTxMiddleware(new FilterUniswapTxMethodsMiddleware(logger))
        .pushTxMiddleware(new AddDecodedMethodToTxMiddleware(logger, abiDecoder))
        .pushTxMiddleware(new FilterOldTxMiddleware(logger, txService))
        .pushTxMiddleware(new FilterAlreadyMinedTxMiddleware(logger))
        .pushTxMiddleware(new FilterNonUniswapTransactionMiddleware(logger))
        .build();

    // Create a listener to notify the bot about incoming tx
    const txListener = new BlockChainListener(
        web3MainNet,
        txMiddlewareBus,
        txService,
        logger
    );

    txListener.startListening();
}

main();