import BN from "bn.js";

const a = new BN("2100000000000000000");
const b = new BN("162923009680994904099");
const c = new BN("1356577690946024101455");
const d = new BN("16392375784098613208");

const x = new BN("4.0552060014524744e+18");

const nom = a.muln(997).mul(c.sub(x.mul(c.muln(997)).div(b.muln(1000).add(x.muln(997)))));
const denom = b.add(x).muln(1000).add(a.muln(997));

const res = nom.div(denom);

console.log(`Calculated=   ${res.toString()}`);
console.log(`amountOutMin= ${d.toString()}`);
console.log(`Difference=   ${d.sub(res).toString()}`);