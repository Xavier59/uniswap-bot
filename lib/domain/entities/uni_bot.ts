import { Transaction as Web3_Transaction } from "web3-eth"
import { ILoggerService } from "../services/i_logger_service";
import { ITransactionService } from "../services/i_transaction_service";
import { RawTransaction } from "../value_types/raw_transaction";
import { ParsedTransactionMethod } from "../value_types/parsed_transaction_method";
import { TransactionPairReserves } from "../value_types/transaction_pair_reserves";
import BN from "bignumber.js";
import { ISimulationBoxBuilder } from "../factories/i_simulation_box_builder";
import { ERC20Methods, ITransactionFactory, TransactionType, UniswapMethods } from "../factories/i_transaction_factory";
import { MAX_ETH_INVEST, UNISWAP_CONTRACT_ADDR } from "../../config";
import { BuiltTransaction, BuiltTransactionReadyToSend } from "../value_types/built_transaction";
import { TransactionFailure } from "../failures/transaction_failure";
import { SimulationBox } from "./simulation_box";

export class UniBot {

    #txService: ITransactionService;
    #transactionfactory: ITransactionFactory;
    #simulationBoxBuilder: ISimulationBoxBuilder;
    #logger: ILoggerService;
    #attackInProcess: boolean;

    constructor(
        txService: ITransactionService,
        transactionfactory: ITransactionFactory,
        simulationBoxBuilder: ISimulationBoxBuilder,
        logger: ILoggerService
    ) {
        this.#txService = txService;
        this.#logger = logger;
        this.#simulationBoxBuilder = simulationBoxBuilder;
        this.#transactionfactory = transactionfactory;
        this.#attackInProcess = false;
    }

    async processTx(
        victimTx: Web3_Transaction
    ) {
        const blockNumber = await this.#txService.fetchBlockNumber();

        this.#logger.addSuccessFortx(victimTx.hash, `Tx ${victimTx.hash} received by the bot`, 2);

        // Call get reserve custom amoutIn amoutOut
        const txMethod: ParsedTransactionMethod = victimTx["decodedMethod"];
        const path = txMethod.params.find(txParam => txParam.name == "path")!.value as string[];

        // Compute reserve impact
        const reserveBeforeVictimTx = await this.#txService.getReserve(path[0], path[1]);
        const rawVictimTx = await this.#txService.getRawTransactionFromHash(victimTx.hash);
        const reserveAfterVictimTxOrFailure = await this._getReserveAfterVictimTx(rawVictimTx, path[0], path[1]);

        // If victim tx fails without us interacting with it
        if (reserveAfterVictimTxOrFailure instanceof TransactionFailure) {
            this.#logger.addErrorForTx(victimTx.hash, `Victim transaction failed: ${reserveAfterVictimTxOrFailure.toString()}`, 2);
        } else {
            // Else try frontrunning
            const reserveOutBefore = new BN(reserveBeforeVictimTx.reserveB);
            const reserveOutAfter = new BN(reserveAfterVictimTxOrFailure.reserveB);
            const reserveImpact = reserveOutAfter.minus(reserveOutBefore).div(reserveOutBefore).times(100).toNumber();
            this.#logger.addInfoForTx(victimTx.hash, `Reserve impact: ${reserveImpact}%`, 2);

            // Make sure the impact is sufficient enough to overflow fees
            // when reserve decreases price increases
            if (reserveImpact > -1) {
                this.#logger.addErrorForTx(victimTx.hash, `Impact too low not worth to trade.`, 3);
            } else {
                this.#logger.addSuccessFortx(victimTx.hash, `Impact interesting, entering trade.`, 3);

                const reserveIn = new BN(reserveBeforeVictimTx.reserveA);
                const reserveOut = new BN(reserveBeforeVictimTx.reserveB);

                // Compute eth to invest to make a worthy trade
                const maxInvestAmount = this._computeEthToInvest(
                    victimTx,
                    reserveIn,
                    reserveOut,
                );

                // Compute how many token we can get for the eth amount invested
                const maxTokenToBuy = this._getAmountOut(
                    maxInvestAmount,
                    reserveIn,
                    reserveOut
                );

                this.#logger.addInfoForTx(
                    victimTx.hash,
                    `Calculated token to buy: ${maxTokenToBuy}`,
                    3
                );

                const approveBuySellTxs = this._buildTransactionsForSandwichAttack(
                    new BN(victimTx.gasPrice),
                    path[0],
                    path[1],
                    maxInvestAmount.toFixed(0, 1),                                          // round down eth invested
                    maxTokenToBuy.toFixed(0, 1),                                            // round down tokens to buy
                    maxInvestAmount.toFixed(0, 1)                                           // round down eth to get back (as much as invested)
                );

                // Simulate on ganache
                const isWorth = await this._simulateSandwichAttackOnGanache(
                    victimTx,
                    rawVictimTx,
                    approveBuySellTxs[0],
                    approveBuySellTxs[1],
                    approveBuySellTxs[2],
                );

                if (this.#attackInProcess) {
                    this.#logger.addErrorForTx(
                        victimTx.hash,
                        `An attack is already processing, abandon`,
                        3
                    );
                }

                if (isWorth && this.#attackInProcess === false) {
                    this.#attackInProcess = true;
                    // await this.frontRun(
                    //     blockNumber,
                    //     approveBuySellTxs[0],
                    //     approveBuySellTxs[1],
                    //     approveBuySellTxs[2]
                    // );
                    this.#attackInProcess = false;
                }
            }
        }

        this.#logger.consumeLogsForTx(victimTx.hash);
    }

    private async frontRun(
        startingBlockNumber: number,
        txHash: string,
        approveTx: BuiltTransactionReadyToSend,
        buyTx: BuiltTransactionReadyToSend,
        sellTx: BuiltTransactionReadyToSend,
    ): Promise<void | TransactionFailure> {

        this.#logger.addInfoForTx(txHash, "Engaging frontRun process on main net", 5);

        // Check still same block
        const curentBlockNumber = await this.#txService.fetchBlockNumber();
        if (startingBlockNumber != curentBlockNumber) {
            this.#logger.addErrorForTx(txHash, "Computation took too long, block number has changed", 5);
            return;
        }

        // Get initial balance
        const balanceBefore = await this.#txService.getBalance();

        // Send all txs without awaiting for each one
        const txs: Promise<void>[] = [];
        try {
            txs.push(this.#txService.sendBuiltTransaction(approveTx));
            txs.push(this.#txService.sendBuiltTransaction(buyTx));
            txs.push(this.#txService.sendBuiltTransaction(sellTx));
            await Promise.all(txs);
        } catch (txFailure) {
            return txFailure;
        }

        const balancAfter = await this.#txService.getBalance();

        const profit = new BN(balancAfter).minus(new BN(balanceBefore));
        if (profit.gt(0)) {
            this.#logger.addSuccessFortx(txHash, `Trade worth, won ${this.#txService.convertToEth(profit.toString())}`, 5);
        } else {
            this.#logger.addErrorForTx(txHash, `Trade NOT worth, lost ${this.#txService.convertToEth(profit.toString())}`, 5);
        }


        this.#txService
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////
    //                                  FRONT RUN
    /////////////////////////////////////////////////////////////////////////////////////////////////
    private _buildTransactionsForSandwichAttack(
        victimGasPrice: BN,
        tokenA: string,
        tokenB: string,
        amountToInvest: string,
        amountTokenToBuy: string,
        amountOutMin: string,
    ): [BuiltTransactionReadyToSend, BuiltTransactionReadyToSend, BuiltTransactionReadyToSend] {

        const currentNonce = this.#txService.getCurrentNonce();

        // Approval transaction
        const approveTx: BuiltTransaction = this.#transactionfactory.createErc20Transaction(
            TransactionType.onGanache,
            tokenB,
            ERC20Methods.approve,
            [
                UNISWAP_CONTRACT_ADDR,                                                                  // Uniswap contract
                "115792089237316195423570985008687907853269984665640564039457584007913129639935"        // UNIT256MAX -1
            ]
        );

        const buyTx = this.#transactionfactory.createUniswapTransaction(
            TransactionType.onGanache,
            UniswapMethods.swapETHForExactTokens,
            [
                amountTokenToBuy,                                           // amoutTokenOut
                [tokenA, tokenB],                                           // Pair
                process.env.ETH_PUBLIC_KEY,                                 // Wallet
                Math.floor(new Date().getTime() / 1000) + 180               // Timestamp
            ]
        );

        const sellTx = this.#transactionfactory.createUniswapTransaction(
            TransactionType.onGanache,
            UniswapMethods.swapExactTokensForETH,
            [
                amountTokenToBuy,                                           // amountIn
                amountOutMin,                                               // amountOutMin
                [tokenB, tokenA],                                           // Pairs
                process.env.ETH_PUBLIC_KEY,                                 // Wallet
                Math.floor(new Date().getTime() / 1000) + 180               // Timestamp
            ]
        );

        return [
            {
                transaction: approveTx,
                sendParams: {
                    from: process.env.ETH_PUBLIC_KEY!,
                    gas: 60000,
                    gasPrice: victimGasPrice.plus(10000001),
                    nonce: currentNonce + 1,
                    to: tokenB,
                },
            },
            {
                transaction: buyTx,
                sendParams: {
                    from: process.env.ETH_PUBLIC_KEY!,
                    gas: 250000,
                    gasPrice: victimGasPrice.plus(10000000),
                    value: amountToInvest,
                    nonce: currentNonce + 2,
                    to: UNISWAP_CONTRACT_ADDR,
                }
            },
            {
                transaction: sellTx,
                sendParams: {
                    from: process.env.ETH_PUBLIC_KEY!,
                    gas: 250000,
                    gasPrice: victimGasPrice,
                    nonce: currentNonce + 3,
                    to: UNISWAP_CONTRACT_ADDR,
                }
            }
        ];
    }

    private async _simulateSandwichAttackOnGanache(
        victimTx: Web3_Transaction,
        rawVictimTx: RawTransaction,
        approveTx: BuiltTransactionReadyToSend,
        buyTx: BuiltTransactionReadyToSend,
        sellTx: BuiltTransactionReadyToSend,
    ) {
        const previousBalance = await this._getGanacheBalance();

        const t1 = new Date().getTime();
        const simualationBoxOrTransactionFailure = await this._simulateTransactions(
            [
                approveTx,
                buyTx,
                rawVictimTx,
                sellTx
            ]
        );

        const t2 = new Date().getTime();
        this.#logger.addInfoForTx(victimTx.hash, `Sandwich attack simulated in ${t2 - t1}ms`, 4);

        // Handle any transaction errors
        if (simualationBoxOrTransactionFailure instanceof TransactionFailure) {
            this.#logger.addErrorForTx(victimTx.hash, `Transaction failed: ${simualationBoxOrTransactionFailure.toString()}`, 4);
            this.#logger.consumeLogsForTx(victimTx.hash);
            return false;
        } else {

            // Check if profit has been made
            const newBalance = await simualationBoxOrTransactionFailure.getBalance();
            this.#logger.addInfoForTx(victimTx.hash, `Balance before attack: ${previousBalance}`, 4);
            this.#logger.addInfoForTx(victimTx.hash, `Balance after attack: ${newBalance}`, 4);
            const wonAmount = new BN(newBalance).minus(new BN(previousBalance));

            if (wonAmount.gt(0)) {
                this.#logger.addSuccessFortx(
                    victimTx.hash,
                    `Trade worth, won ${this.#txService.convertToEth(wonAmount.toString())}`,
                    4
                );
                return true;
            } else {
                this.#logger.addErrorForTx(victimTx.hash, `Trade not worth`, 4);
                return false;
            }
        }
    }

    private _computeEthToInvest(
        victimTx: Web3_Transaction,
        reserveIn: BN,
        reserveOut: BN
    ): BN {

        const decodedTxMethod: ParsedTransactionMethod = victimTx["decodedMethod"];
        const amountOutMin = new BN(decodedTxMethod.params.find(txParam => txParam.name === "amountOutMin")!.value as string);
        const amountIn = new BN(victimTx.value);

        this.#logger.addInfoForTx(victimTx.hash, `Reserve in: ${reserveIn}`, 3);
        this.#logger.addInfoForTx(victimTx.hash, `Reserve out: ${reserveOut}`, 3);
        this.#logger.addInfoForTx(victimTx.hash, `amountIn: ${amountIn}`, 3);
        this.#logger.addInfoForTx(victimTx.hash, `amountOutMin: ${amountOutMin}`, 3);

        // Max eth to invest to make as much profit as possible when selling back
        const t1 = new Date().getTime();
        let maxInvestAmount = this._computeMaxAmountInToInvest(
            victimTx.hash,
            reserveIn,
            reserveOut,
            amountIn,
            amountOutMin
        );
        const t2 = new Date().getTime();
        this.#logger.addInfoForTx(victimTx.hash, `Dichotomie done in ${t2 - t1}ms`, 4);

        // Do not risk to much, clip max invest to MAX_ETH_INVEST
        if (maxInvestAmount.gt(MAX_ETH_INVEST)) {
            const maxEthInEth = this.#txService.convertToEth(MAX_ETH_INVEST.toString());
            this.#logger.addInfoForTx(victimTx.hash, `Invest amount to high, clipping to ${MAX_ETH_INVEST}(${maxEthInEth} ETH)`, 4);
            maxInvestAmount = MAX_ETH_INVEST;
        }
        return maxInvestAmount;
    }

    private async _getReserveAfterVictimTx(
        victimTx: RawTransaction,
        tokenA: string,
        tokenB: string
    ): Promise<TransactionPairReserves | TransactionFailure> {
        const simulationBox = this.#simulationBoxBuilder.copy().addTx(victimTx).build();
        const voidOrTransactionFailure = await simulationBox.simulate();

        if (voidOrTransactionFailure instanceof TransactionFailure) {
            return voidOrTransactionFailure;
        }
        return await simulationBox.getSimulationReserves(tokenA, tokenB);
    }

    private _computeMaxAmountInToInvest(
        txHash: string,
        reserveIn: BN,
        reserveOut: BN,
        amountIn: BN,
        amountOutMin: BN
    ): BN {

        let numIter = 10000;
        let up = reserveIn;
        let down = new BN("0");
        let x = up.div(2);
        let xTooBig = true;

        let previousBestPossibleX = new BN("0");
        let amountOut = new BN("0");

        while (numIter > 0) {

            amountOut = this._getAmountOut(
                amountIn,
                reserveIn.plus(x),
                reserveOut.minus(this._getAmountOut(
                    x,
                    reserveIn,
                    reserveOut,
                ))
            );

            if (amountOut.lt(amountOutMin)) {
                up = x;
                xTooBig = true;
            } else if (amountOut.gt(amountOutMin)) {
                previousBestPossibleX = x;
                down = x;
                xTooBig = false;
            } else {
                xTooBig = false;
                break;
            }

            x = up.plus(down).div(2);
            numIter -= 1;
        }

        if (xTooBig) {
            let difference = amountOutMin.minus(amountOut);
            this.#logger.addInfoForTx(
                txHash,
                `x was too big, taking last x ${previousBestPossibleX.toFixed(0, 1)}(Difference: ${difference.toFixed(4)})`,
                4
            );
        }

        return xTooBig ? previousBestPossibleX : x;
    }

    private _getAmountOut(
        amountIn: BN,
        reserveIn: BN,
        reserveOut: BN
    ): BN {
        const amountInWithFee = amountIn.times(997);
        const numerator = amountInWithFee.times(reserveOut);
        const denominator = reserveIn.times(1000).plus(amountInWithFee);
        return numerator.div(denominator);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////
    //                                  GANACHE
    /////////////////////////////////////////////////////////////////////////////////////////////////

    private async _getGanacheBalance() {
        return this.#simulationBoxBuilder.copy().build().getBalance();
    }

    private async _simulateTransactions(
        transactions: Array<BuiltTransactionReadyToSend | RawTransaction>
    ): Promise<SimulationBox | TransactionFailure> {

        const simulationBoxBuilder = this.#simulationBoxBuilder.copy();

        for (const tx of transactions) {
            simulationBoxBuilder.addTx(tx);
        }

        const simulationBox = simulationBoxBuilder.build();

        const voidOrFailure = await simulationBox.simulate();
        if (typeof voidOrFailure === "object") {
            return voidOrFailure;
        }

        return simulationBox;

    }
}