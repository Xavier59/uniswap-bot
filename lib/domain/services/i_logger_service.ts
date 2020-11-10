export interface ILoggerService {

    // Specify option for the logger
    configure(option: Object): void;

    // Add debug log for a given tx
    addDebugForTx(txHash: string, msg: string, indent: number): void;

    // Add infos log for a given tx
    addInfoForTx(txHash: string, msg: string, indent: number): void;

    // Add error log for a given tx
    addErrorForTx(txHash: string, msg: string, indent: number): void;

    // Add success log for a given tx
    addSuccessFortx(txHash: string, msg: string, indent: number): void;

    // Show all the logs for the given tx
    // When showed, the logs are then deleted from memory
    showLogsForTx(txHash: string): void;

    // !Warning not threadsafe!
    // Display general app info
    logGeneralInfo(msg: string);
}