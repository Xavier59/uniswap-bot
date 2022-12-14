import { ILoggerService } from "../../domain/services/i_logger_service";

const dateOption = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
};

export class ConsoleLogger implements ILoggerService {

    #logBuffer: Object;

    #logTxError: boolean;
    #logTxInfo: boolean;
    #logTxDebug: boolean;
    #logTxSuccess: boolean;

    #logGeneralInfo: boolean;

    constructor() {
        this.#logBuffer = {};

        this.#logTxError = false;
        this.#logTxInfo = false;
        this.#logTxDebug = false;
        this.#logTxSuccess = false;

        this.#logGeneralInfo = false;
    }


    configure(
        option: Object
    ): void {
        this.#logTxError = option["logTxError"] || this.#logTxError;
        this.#logTxInfo = option["logTxInfo"] || this.#logTxInfo;
        this.#logTxDebug = option["logTxDebug"] || this.#logTxDebug;
        this.#logTxSuccess = option["logTxSuccess"] || this.#logTxSuccess;

        this.#logGeneralInfo = option["logGeneralInfo"] || this.#logGeneralInfo;
    }

    addDebugForTx(txHash: string,
        msg: string,
        indent: number
    ): void {
        if (this.#logTxDebug) this._addLogForTx(txHash, `[?] ${msg}`, indent);
    }

    addInfoForTx(txHash: string,
        msg: string,
        indent: number
    ): void {
        if (this.#logTxInfo) this._addLogForTx(txHash, `[*] ${msg}`, indent);
    }

    addErrorForTx(txHash: string,
        msg: string,
        indent: number
    ): void {
        if (this.#logTxError) this._addLogForTx(txHash, `[-] ${msg}`, indent);
    }

    addSuccessFortx(txHash: string,
        msg: string,
        indent: number
    ): void {
        if (this.#logTxSuccess) this._addLogForTx(txHash, `[+] ${msg}`, indent);
    }

    consumeLogsForTx(
        txHash: string
    ): void {
        if (txHash in this.#logBuffer) {
            console.log(this.#logBuffer[txHash]);
            delete this.#logBuffer[txHash];
        }
    }

    logGeneralInfo(
        msg: string
    ) {
        if (this.#logGeneralInfo) {
            const currentdate = new Date();
            const dateTime = currentdate.toLocaleString('en-GB', dateOption).replace(',', '');
            const loggedLine = `${dateTime}\t${msg}`;
            console.log(loggedLine);
        }
    }

    _addLogForTx(
        txHash: string,
        msg: string,
        indent: number
    ): void {

        const currentdate = new Date();
        const dateTime = currentdate.toLocaleString('en-GB', dateOption).replace(',', '');
        const loggedLine = `${dateTime}\t${'\t'.repeat(indent)}${msg}\n`;

        if (txHash in this.#logBuffer) {
            this.#logBuffer[txHash] = this.#logBuffer[txHash].concat(loggedLine);
        } else {
            const newSection = "------------------------------------------------------------------------------------------------------------------------\n";
            this.#logBuffer[txHash] = newSection.concat(loggedLine);
        }

    }

}