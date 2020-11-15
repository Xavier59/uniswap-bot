const Web3 = require('web3');
const { readFileSync } = require("fs");
const abiDecoder = require("abi-decoder");

const web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545/"));
const uniswapABI = JSON.parse(readFileSync("../abi/CustomUniswap.abi.json").toString());
abiDecoder.addABI(uniswapABI);

let contract = new web3.eth.Contract(uniswapABI, "0xc5842ab358f9bb14acb249bc703c39af7d2ca2aa");
let buyTx = contract.methods.swapETHForExactTokens(5000, ["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "0x250a3500f48666561386832f1F1f1019b89a2699"], "0xfDce3C62457EE3ECa05a882fc250c04e9e67012a", 11263347)

async function main() {
    let signedTransaction = await web3.eth.accounts.signTransaction(
        {
            gasPrice: 10000,
            gas: 300000,
            value: 10000000000,
            to: "0xc5842ab358f9bb14acb249bc703c39af7d2ca2aa",
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