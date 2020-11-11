export type BuiltTransactionMethodParams = Array<any>;

export type BuiltTransaction = Object;

export type BuiltTransactionReadyToSend = {
    transaction: BuiltTransaction,
    sendParams: Object,
};