const Migrations = artifacts.require("UniswapHelper");

module.exports = function (deployer) {
  deployer.deploy(Migrations);
};
