const Migrations = artifacts.require("UniswapHelper");

module.exports = function (deployer) {
  deployer.deploy(Migrations, "0x7a250d5630b4cf539739df2c5dacb4c659f2488d");
};
