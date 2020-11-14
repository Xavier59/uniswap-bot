const Web3 = require('web3');
const { readFileSync } = require("fs");
const abiDecoder = require("abi-decoder");

const web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545/"));
const uniswapABI = JSON.parse(readFileSync("../abi/CustomUniswap.abi.json").toString());
abiDecoder.addABI(uniswapABI);

// 11257845

// sendParams: {
//     from: process.env.ETH_PUBLIC_KEY!,
//         gas: 250000,
//             gasPrice: victimGasPrice.plus(victimGasPrice).toFixed(0, 1),
//                 value: amountToInvest,
//                     nonce: currentNonce + 1,
//                         to: UNISWAP_CONTRACT_ADDR,
//                 }

let contract = new web3.eth.Contract(uniswapABI, "0x47835843CDeCFb5AEF3f123993976920a7110f75");
let buyTx = contract.methods.swapExactETHForTokens(5000, ["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "0x250a3500f48666561386832f1F1f1019b89a2699"], "0xfDce3C62457EE3ECa05a882fc250c04e9e67012a", 11258439)

async function main() {
    let signedTransaction = await web3.eth.accounts.signTransaction(
        {
            gasPrice: 10000,
            gas: 300000,
            value: 100,
            to: "0x47835843CDeCFb5AEF3f123993976920a7110f75",
            data: buyTx.encodeABI()
        },
        "PRIV_KEY"
    )

    try {
        let res = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction, (err, data) => console.log(`error : ${err}`));
        console.log(res);
    } catch (err) {
        console.log(err);
    }

}

main();