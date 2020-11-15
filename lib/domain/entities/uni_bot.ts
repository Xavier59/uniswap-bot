import { Transaction as Web3_Transaction } from "web3-eth"
import { ILoggerService } from "../services/i_logger_service";
import { ITransactionService } from "../services/i_transaction_service";
import { RawTransaction } from "../value_types/raw_transaction";
import { ParsedTransactionMethod } from "../value_types/parsed_transaction_method";
import { TransactionPairReserves } from "../value_types/transaction_pair_reserves";
import BN from "bignumber.js";
import { ISimulationBoxBuilder } from "../factories/i_simulation_box_builder";
import { ERC20Methods, ITransactionFactory, TransactionType, UniswapMethods } from "../factories/i_transaction_factory";
import { CUSTOM_CONTRACT_ADDR, MAX_ETH_INVEST, UNISWAP_CONTRACT_ADDR } from "../../config";
import { BuiltTransaction, BuiltTransactionReadyToSend } from "../value_types/built_transaction";
import { TransactionFailure } from "../failures/transaction_failure";
import { SimulationBox } from "./simulation_box";
import { ITokenService } from "../services/i_token_service";

export class UniBot {

    #loggerService: ILoggerService;
    #txService: ITransactionService;
    #tokenService: ITokenService;

    #transactionfactory: ITransactionFactory;
    #simulationBoxBuilder: ISimulationBoxBuilder;

    #attackInProcess: boolean;

    constructor(
        loggerService: ILoggerService,
        txService: ITransactionService,
        tokenService: ITokenService,
        transactionfactory: ITransactionFactory,
        simulationBoxBuilder: ISimulationBoxBuilder,
    ) {
        this.#loggerService = loggerService;
        this.#txService = txService;
        this.#tokenService = tokenService;
        this.#simulationBoxBuilder = simulationBoxBuilder;
        this.#transactionfactory = transactionfactory;
        this.#attackInProcess = false;
    }

    async processTx(
        victimTx: Web3_Transaction
    ) {

        // Get the block number before all computation
        // used to make sur the block has not been mined
        // when we trigger the attack
        const blockNumber = this.#txService.getBlockNumber();
        this.#loggerService.addInfoForTx(victimTx.hash, `Entering bot on block ${blockNumber}`, 2);

        this.#loggerService.addSuccessFortx(victimTx.hash, `Tx ${victimTx.hash} received by the bot`, 2);

        // Call get reserve custom amoutIn amoutOut
        const txMethod: ParsedTransactionMethod = victimTx["decodedMethod"];
        const path = txMethod.params.find(txParam => txParam.name == "path")!.value as string[];

        // Compute reserve impact
        const tokenA = path[0];
        const tokenB = path[1];
        const reserveBeforeVictimTx = await this.#txService.getReserve(tokenA, tokenB);
        const rawVictimTx = await this.#txService.getRawTransactionFromHash(victimTx.hash);
        const reserveAfterVictimTxOrFailure = await this._getReserveAfterVictimTx(rawVictimTx, tokenA, tokenB);

        // If victim tx fails without us interacting with it
        if (reserveAfterVictimTxOrFailure instanceof TransactionFailure) {
            this.#loggerService.addErrorForTx(victimTx.hash, `Victim transaction failed: ${reserveAfterVictimTxOrFailure.toString()}`, 2);
        } else {
            // Else try frontrunning
            const reserveOutBefore = new BN(reserveBeforeVictimTx.reserveB);
            const reserveOutAfter = new BN(reserveAfterVictimTxOrFailure.reserveB);
            const reserveImpact = reserveOutAfter.minus(reserveOutBefore).div(reserveOutBefore).times(100).toNumber();
            this.#loggerService.addInfoForTx(victimTx.hash, `Reserve impact: ${reserveImpact}%`, 2);

            // Make sure the impact is sufficient enough to overflow fees
            // (when reserve decreases price increases)
            if (reserveImpact > -1) {
                this.#loggerService.addErrorForTx(victimTx.hash, `Impact too low not worth to trade.`, 3);
            } else {
                this.#loggerService.addSuccessFortx(victimTx.hash, `Impact interesting, entering trade.`, 3);

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

                this.#loggerService.addInfoForTx(
                    victimTx.hash,
                    `Calculated token to buy: ${maxTokenToBuy}`,
                    3
                );

                let nonce = this.#txService.getCurrentNonce();
                const victimGasPrice = new BN(victimTx.gasPrice);

                // Check if token has been approved yet
                const transactions: [(BuiltTransactionReadyToSend | RawTransaction)[], (BuiltTransactionReadyToSend | RawTransaction)[]] = [[], []];
                const tokenIsApproved = await this.#tokenService.isApproved(tokenB);

                if (tokenIsApproved === false) {
                    const approveTransaction = this._buildApproveTransaction(
                        ++nonce,
                        victimGasPrice,
                        tokenB
                    );
                    this.#loggerService.addDebugForTx(
                        victimTx.hash,
                        `Approve transaction added before the attack`,
                        3
                    );

                    // Add the approve tx for both the list of 
                    // ganache and mainet txs
                    transactions[0].push(approveTransaction);
                    transactions[1].push(approveTransaction);
                }

                const sandwitchAttackTxs = this._buildTransactionsForSandwichAttack(
                    blockNumber + 1,
                    nonce,
                    victimGasPrice,
                    path[0],
                    path[1],
                    maxInvestAmount.toFixed(0, 1),                                          // round down eth invested
                    maxTokenToBuy.toFixed(0, 1),                                            // round down tokens to buy
                    maxInvestAmount.toFixed(0, 1)                                           // round down eth to get back (as much as invested)
                );

                // Add all the transaction required by the attack
                // on both txs list
                transactions[0].push(...sandwitchAttackTxs[0]);
                transactions[1].push(...sandwitchAttackTxs[1]);

                // Simulate on ganache
                const isWorth = await this._simulateSandwichAttackOnGanache(
                    victimTx.hash,
                    !tokenIsApproved,
                    rawVictimTx,
                    transactions[0]
                );

                if (this.#attackInProcess) {
                    this.#loggerService.addErrorForTx(
                        victimTx.hash,
                        `An attack is already processing, abandon`,
                        3
                    );
                    return;
                } else if (isWorth && this.#attackInProcess === false) {
                    this.#attackInProcess = true;
                    // const voidOrTransactionFailure = await this.frontRun(
                    //     victimTx.hash,
                    //     blockNumber,
                    //     transactions[1]
                    // );

                    // if (voidOrTransactionFailure instanceof TransactionFailure) {
                    //     this.#loggerService.addErrorForTx(victimTx.hash, `Transaction failed on mainnet: ${voidOrTransactionFailure.toString()}`, 4);

                    //     // if the approval transaction did not fail we need to update the db as well
                    //     if (voidOrTransactionFailure.getMethod() !== "approve") {
                    //         await this.#tokenService.approveToken(tokenB);
                    //     }

                    //     this.#loggerService.consumeLogsForTx(victimTx.hash);
                    //     process.exit();

                    // } else {
                    //     // if we sent an approve tx, add the token to the approved list on database
                    //     if (tokenIsApproved == false) {
                    //         await this.#tokenService.approveToken(tokenB);
                    //     }
                    // }

                    // // In all cases, update nonce
                    // await this.#txService.updateNonce();

                    // Free the "lock" lol
                    this.#attackInProcess = false;
                }

            }
        }

        this.#loggerService.consumeLogsForTx(victimTx.hash);
    }

    private async frontRun(
        txHash: string,
        startingBlockNumber: number,
        transactions: Array<BuiltTransactionReadyToSend | RawTransaction>,
    ): Promise<void | TransactionFailure> {

        this.#loggerService.addInfoForTx(txHash, "Engaging frontRun process on main net", 5);

        // Check still same block
        const curentBlockNumber = this.#txService.getBlockNumber();
        this.#loggerService.addInfoForTx(txHash, `Trying on block ${curentBlockNumber}`, 5);

        if (startingBlockNumber != curentBlockNumber) {
            this.#loggerService.addErrorForTx(txHash, "Computation took too long, block number has changed", 5);
            return;
        }

        // Get initial balance
        const balanceBefore = await this.#txService.fetchBalance();

        // Send all txs without awaiting for each one
        const txs: Promise<void>[] = [];
        try {
            for (const tx of transactions) {
                if (typeof tx === "string") {
                    txs.push(this.#txService.sendRawTransaction(tx));
                } else {
                    txs.push(this.#txService.sendBuiltTransaction(tx));
                }
            }
            await Promise.all(txs);
        } catch (txFailure) {
            return txFailure;
        }

        const balancAfter = await this.#txService.fetchBalance();

        const profit = new BN(balancAfter).minus(new BN(balanceBefore));
        if (profit.gt(0)) {
            this.#loggerService.addSuccessFortx(txHash, `Trade worth, won ${this.#txService.convertToEth(profit.toString())}`, 5);
        } else {
            this.#loggerService.addErrorForTx(txHash, `Trade NOT worth, lost ${this.#txService.convertToEth(profit.toString())}`, 5);
            this.#loggerService.consumeLogsForTx(txHash);
            process.exit();
        }


        this.#txService
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////
    //                                  FRONT RUN
    /////////////////////////////////////////////////////////////////////////////////////////////////
    private _buildApproveTransaction(
        currentNonce: number,
        victimGasPrice: BN,
        tokenB: string,
    ): BuiltTransactionReadyToSend {

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
        return {
            transaction: approveTx,
            sendParams: {
                from: process.env.ETH_PUBLIC_KEY!,
                gas: 60000,
                gasPrice: victimGasPrice.plus(10000001),
                nonce: currentNonce,
                to: tokenB,
            },
        };
    }

    // Returns 2 list of tx, first for ganache (with timestamp)
    // second for mainnet with our on custom contract
    private _buildTransactionsForSandwichAttack(
        nextBlockNumber: number,
        currentNonce: number,
        victimGasPrice: BN,
        tokenA: string,
        tokenB: string,
        amountToInvest: string,
        amountTokenToBuy: string,
        amountOutMin: string,
    ): [[BuiltTransactionReadyToSend, BuiltTransactionReadyToSend], [BuiltTransactionReadyToSend, BuiltTransactionReadyToSend]] {

        const buyTxGanache = this.#transactionfactory.createUniswapTransaction(
            TransactionType.onGanache,
            UniswapMethods.swapETHForExactTokens,
            [
                amountTokenToBuy,                                           // amoutTokenOut
                [tokenA, tokenB],                                           // Pair
                process.env.ETH_PUBLIC_KEY,                                 // Wallet
                Math.floor(new Date().getTime() / 1000) + 180               // Normal required timestamp for Ganache
            ]
        );

        const buyTxMainNet = this.#transactionfactory.createUniswapTransaction(
            TransactionType.onMainNet,
            UniswapMethods.swapETHForExactTokens,
            [
                amountTokenToBuy,                                           // amoutTokenOut
                [tokenA, tokenB],                                           // Pair
                process.env.ETH_PUBLIC_KEY,                                 // Wallet
                nextBlockNumber                                             // Block number required for our custom contract
            ]
        );

        const sellTxGanache = this.#transactionfactory.createUniswapTransaction(
            TransactionType.onGanache,
            UniswapMethods.swapExactTokensForETH,
            [
                amountTokenToBuy,                                           // amountIn
                amountOutMin,                                               // amountOutMin
                [tokenB, tokenA],                                           // Pairs
                process.env.ETH_PUBLIC_KEY,                                 // Wallet
                Math.floor(new Date().getTime() / 1000) + 86400        // max timestamp for sell tx
            ]
        );

        const sellTxMainNet = this.#transactionfactory.createUniswapTransaction(
            TransactionType.onMainNet,
            UniswapMethods.swapExactTokensForETH,
            [
                amountTokenToBuy,                                           // amountIn
                new BN(amountOutMin).times("0.99").toFixed(0, 1),           // amountOutMin
                [tokenB, tokenA],                                           // Pairs
                process.env.ETH_PUBLIC_KEY,                                 // Wallet
                Math.floor(new Date().getTime() / 1000) + 86400        // max timestamp for sell tx
            ]
        );

        let buyOnGanacheReadyToSend = {
            transaction: buyTxGanache,
            sendParams: {
                from: process.env.ETH_PUBLIC_KEY!,
                gas: 250000,
                gasPrice: victimGasPrice.plus(victimGasPrice).toFixed(0, 1),
                value: amountToInvest,
                nonce: currentNonce + 1,
                to: UNISWAP_CONTRACT_ADDR,
            }
        };

        let buyOnMainNetReadyToSend = {
            transaction: buyTxMainNet,
            sendParams: {
                from: process.env.ETH_PUBLIC_KEY!,
                gas: 250000,
                gasPrice: victimGasPrice.plus(victimGasPrice).toFixed(0, 1),
                value: new BN(amountToInvest).times("1.01").toFixed(0, 1),
                nonce: currentNonce + 1,
                to: CUSTOM_CONTRACT_ADDR,
            }
        };

        let sellOnGanacheReadyTosend = {
            transaction: sellTxGanache,
            sendParams: {
                from: process.env.ETH_PUBLIC_KEY!,
                gas: 250000,
                gasPrice: victimGasPrice,
                nonce: currentNonce + 2,
                to: UNISWAP_CONTRACT_ADDR,
            }
        };

        let sellOnMainNetReadyTosend = {
            transaction: sellTxMainNet,
            sendParams: {
                from: process.env.ETH_PUBLIC_KEY!,
                gas: 250000,
                gasPrice: victimGasPrice,
                nonce: currentNonce + 2,
                to: UNISWAP_CONTRACT_ADDR,
            }
        };

        return [
            [buyOnGanacheReadyToSend, sellOnGanacheReadyTosend],
            [buyOnMainNetReadyToSend, sellOnMainNetReadyTosend]
        ];
    }

    private async _simulateSandwichAttackOnGanache(
        txHash: string,
        hasApprove: boolean,
        victimTx: RawTransaction,
        transactions: Array<BuiltTransactionReadyToSend | RawTransaction>

    ): Promise<boolean> {

        const ganacheTxs: Array<BuiltTransactionReadyToSend | RawTransaction> = [...transactions];

        // If the txs contains the approve tx
        // insert the victim tx to the appropriate index
        if (hasApprove) {
            ganacheTxs.splice(2, 0, victimTx)
        } else {
            ganacheTxs.splice(1, 0, victimTx)
        }

        const previousBalance = await this._getGanacheBalance();

        const t1 = new Date().getTime();
        const simualationBoxOrTransactionFailure = await this._simulateTransactions(ganacheTxs);

        const t2 = new Date().getTime();
        this.#loggerService.addInfoForTx(txHash, `Sandwich attack simulated in ${t2 - t1}ms`, 4);

        // Handle any transaction errors
        if (simualationBoxOrTransactionFailure instanceof TransactionFailure) {
            this.#loggerService.addErrorForTx(txHash, `Transaction failed: ${simualationBoxOrTransactionFailure.toString()}`, 4);
            this.#loggerService.consumeLogsForTx(txHash);
            return false;
        } else {

            // Check if profit has been made
            const newBalance = await simualationBoxOrTransactionFailure.getBalance();
            this.#loggerService.addInfoForTx(txHash, `Balance before attack: ${previousBalance}`, 4);
            this.#loggerService.addInfoForTx(txHash, `Balance after attack: ${newBalance}`, 4);
            const wonAmount = new BN(newBalance).minus(new BN(previousBalance));

            if (wonAmount.gt("0")) {
                this.#loggerService.addSuccessFortx(
                    txHash,
                    `Trade worth on simulation, won ${this.#txService.convertToEth(wonAmount.toString())}`,
                    4
                );

                const ethAmount = new BN(this.#txService.convertToEth(wonAmount.toString()));
                if (ethAmount.lt("0.01")) {
                    this.#loggerService.addErrorForTx(
                        txHash,
                        `Not enough profit made on simulation, abandon (${ethAmount} ETH)`,
                        4
                    );
                    return false;
                }
                return true;
            } else {
                this.#loggerService.addErrorForTx(txHash, `Trade not worth on simulation, abandon`, 4);
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

        this.#loggerService.addInfoForTx(victimTx.hash, `Reserve in: ${reserveIn}`, 3);
        this.#loggerService.addInfoForTx(victimTx.hash, `Reserve out: ${reserveOut}`, 3);
        this.#loggerService.addInfoForTx(victimTx.hash, `amountIn: ${amountIn}`, 3);
        this.#loggerService.addInfoForTx(victimTx.hash, `amountOutMin: ${amountOutMin}`, 3);

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
        this.#loggerService.addInfoForTx(victimTx.hash, `Dichotomie done in ${t2 - t1}ms`, 4);

        // Do not risk to much, clip max invest to MAX_ETH_INVEST
        if (maxInvestAmount.gt(MAX_ETH_INVEST)) {
            const maxEthInEth = this.#txService.convertToEth(MAX_ETH_INVEST.toString());
            this.#loggerService.addInfoForTx(victimTx.hash, `Invest amount to high, clipping to ${MAX_ETH_INVEST}(${maxEthInEth} ETH)`, 4);
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

        let numIter = 5000;
        let up = reserveIn;
        let down = new BN("0");
        let x = up.div(2);
        let xTooBig = true;

        let previousBestPossibleX = new BN("0");
        let amountOut = new BN("0");

        // Test with reserveIn as x
        amountOut = this._getAmountOut(
            amountIn,
            reserveIn.plus(reserveIn),
            reserveOut.minus(this._getAmountOut(
                reserveIn,
                reserveIn,
                reserveOut,
            ))
        );

        // Skipp calculation if x = reserveIn => amoutOut <= amoutOutMin
        if (amountOut.gte(amountOutMin)) {
            this.#loggerService.addInfoForTx(
                txHash,
                `x could be equal to reserveIn, leaving dichotomie`,
                4
            );
            return reserveIn;
        }

        // Else process dichotomie to find best x
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
            const difference = amountOutMin.minus(amountOut);
            this.#loggerService.addInfoForTx(
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
        if (voidOrFailure instanceof TransactionFailure) {
            return voidOrFailure;
        }

        return simulationBox;

    }
}