// Tx Method example
// {
//     "name": "swapExactETHForTokens",
//     "params": [
//         {
//             "name": "amountOutMin",
//             "value": "76748509373",
//             "type": "uint256"
//         },
//         {
//             "name": "path",
//             "value": [
//                 "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
//                 "0xa393473d64d2f9f026b60b6df7859a689715d092"
//             ],
//             "type": "address[]"
//         },
//         {
//             "name": "to",
//             "value": "0x1d3b028771f4a47a722b11f9500e4720cdd55eb9",
//             "type": "address"
//         },
//         {
//             "name": "deadline",
//             "value": "1604765734",
//             "type": "uint256"
//         }
//     ]
// }


export type TxMethod = {
    "name": string,
    "params": Array<TxMethodParams>
}

export type TxMethodParams = {
    "name": string,
    "value": string | Array<string>
    "type": string
}

// Reserves example
// {
//     "0": "45819178185284962184",
//     "1": "185962144006351182704497",
//     "reserveA": "45819178185284962184",
//     "reserveB": "185962144006351182704497"
// }

export type TxPairReserves = {
    "0": string,
    "1": string,
    "reserveA": string,
    "reserveB": string
}