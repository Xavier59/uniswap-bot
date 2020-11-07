export interface ILogger {
    configure(option: Object): void;

    addDebugForTx(txHash: string, msg: string, indent: number): void;
    addInfoForTx(txHash: string, msg: string, indent: number): void;
    addErrorForTx(txHash: string, msg: string, indent: number): void;
    addSuccessFortx(txHash: string, msg: string, indent: number): void;
    showLogsForTx(txHash: string): void;

    logGeneralInfo(msg: string);
}