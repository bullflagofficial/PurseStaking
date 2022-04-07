const { deployProxy } = require('@openzeppelin/truffle-upgrades');

const PurseStaking = artifacts.require("PurseStaking");

module.exports = async function(deployer) {
  await deployProxy(PurseStaking, ["0x29a63F4B209C29B4DC47f06FFA896F32667DAD2C"], { deployer, kind: 'uups' })
};

