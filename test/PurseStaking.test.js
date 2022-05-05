const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const purseStaking = artifacts.require("PurseStaking");
const purseToken = artifacts.require("PurseTokenUpgradable");
const { time } = require("@openzeppelin/test-helpers");

function purse(n) {
  return web3.utils.toWei(n, 'ether');
}

contract("PurseStaking", accounts => {
  beforeEach(async () =>  {
    this.purseTokenInstance = await  deployProxy(purseToken,[accounts[0], accounts[1], 10, 5, 5])
    this.purseStakingInstance = await deployProxy(purseStaking, [this.purseTokenInstance.address])
    await this.purseTokenInstance.updateDPoolAdd(this.purseStakingInstance.address)
    await this.purseTokenInstance.setWhitelistedTo(accounts[0])
    await this.purseTokenInstance.setWhitelistedTo(accounts[1])
    await this.purseTokenInstance.setWhitelistedTo(this.purseStakingInstance.address)
    await this.purseTokenInstance.setWhitelistedFrom(accounts[0])
    await this.purseTokenInstance.setWhitelistedFrom(accounts[1])
    await this.purseTokenInstance.setWhitelistedFrom(this.purseStakingInstance.address)
  })

  it("A stakes 6 purse should fail as balance insufficient", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("5"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("6"), {from: accounts[2]}) // Set allowance of 6 purse
    try {
      await this.purseStakingInstance.enterOld(purse("6"), {from: accounts[2]}) // User A stakes 6 purse
      assert.fail("Should have thrown an error")
    } catch(error) {
      assert.include(error.message, "revert", "The error message should contain revert")
    }
  });

  it("A stakes 5 purse should fail as contract is paused", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("5"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("5"), {from: accounts[2]}) // Set allowance of 5 purse
    await this.purseStakingInstance.pause()
    try {
      await this.purseStakingInstance.enterOld(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
      assert.fail("Should have thrown an error")
    } catch(error) {
      assert.include(error.message, "revert", "The error message should contain revert")
    }
  });

  it("A stakes 5 purse should return 5 receipt and 5 purse after unpaused", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("5"), {from: accounts[0]})
    const userABalBef = await this.purseTokenInstance.balanceOf(accounts[2])
    assert.equal(userABalBef, purse("5"))
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("5"), {from: accounts[2]}) // Set allowance of 5 purse
    await this.purseStakingInstance.pause()
    try {
      await this.purseStakingInstance.enterOld(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
      assert.fail("Should have thrown an error")
    } catch(error) {
      assert.include(error.message, "revert", "The error message should contain revert")
    }
    await this.purseStakingInstance.unpause()
    await this.purseStakingInstance.enterOld(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    const userABalAft = await this.purseTokenInstance.balanceOf(accounts[2])
    assert.equal(userABalAft, 0)
    const userAPurseBal = await this.purseStakingInstance.getTotalPurse(accounts[2]) // Get user stake balance
    assert.equal(userAPurseBal, purse("5"))
    const receiptSupply = await this.purseStakingInstance.totalReceiptSupply()  // Get the total number of receipt 
    assert.equal(receiptSupply, purse("5"))
    const purseStakingBal = await this.purseTokenInstance.balanceOf(this.purseStakingInstance.address) // Get total purse in staking contract
    assert.equal(purseStakingBal, purse("5"))
    console.log("Total Purse: " + purseStakingBal.toString() + " Total Receipt: " + receiptSupply.toString())
  });

  it("Incoming 10 purse should return 15 purse", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("5"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("5"), {from: accounts[2]}) // Set allowance of 5 purse
    await this.purseStakingInstance.enterOld(purse("5"), {from: accounts[2]}) // User A stakes 5 purse

    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    const userBal = await this.purseTokenInstance.balanceOf(accounts[4]) //B=20, D=10, L=10
    assert.equal(userBal, purse("19960"))
    const purseStakingBal = await this.purseTokenInstance.balanceOf(this.purseStakingInstance.address);  //Total balance of purse in purse staking contract
    assert.equal(purseStakingBal, purse("15"))
    console.log("Total Purse: " + purseStakingBal.toString())
  });

  it("New Stake: B stakes 15 purse should return 10 receipt and 30 purse", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("5"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("5"), {from: accounts[2]}) // Set allowance of 5 purse
    await this.purseStakingInstance.enterOld(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})

    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    const userBBalBef = await this.purseTokenInstance.balanceOf(accounts[5])
    assert.equal(userBBalBef, purse("15"))
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enter(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    const userBBalAft = await this.purseTokenInstance.balanceOf(accounts[5])
    assert.equal(userBBalAft, 0)
    const userBReceipt = await this.purseStakingInstance.userReceiptToken(accounts[5])
    assert.equal(userBReceipt, purse("5")) //15/15x5=5
    const userBPurseBal = await this.purseStakingInstance.getTotalPurse(accounts[5]) // Get user stake balance
    assert.equal(userBPurseBal, purse("15")) //5/10x30=15
    const receiptSupply = await this.purseStakingInstance.totalReceiptSupply()  // Get the total number of receipt 
    assert.equal(receiptSupply, purse("10"))
    const purseStakingBal = await this.purseTokenInstance.balanceOf(this.purseStakingInstance.address) // Get total purse in staking contract
    assert.equal(purseStakingBal, purse("30"))
    console.log("Total Purse: " + purseStakingBal.toString() + " Total Receipt: " + receiptSupply.toString())
  });

  it("Incoming 10 purse should return 40 purse", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("5"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("5"), {from: accounts[2]}) // Set allowance of 5 purse
    await this.purseStakingInstance.enterOld(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enter(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]})
    const userBal = await this.purseTokenInstance.balanceOf(accounts[4]) //B=20, D=10, L=10
    assert.equal(userBal, purse("19960"))
    const purseStakingBal = await this.purseTokenInstance.balanceOf(this.purseStakingInstance.address) //Total balance of purse in purse staking contract
    assert.equal(purseStakingBal, purse("40"))
    console.log("Total Purse: " + purseStakingBal.toString())
  });

  it("New Stake: A stakes 10 purse should return 12.5 receipt and 50 purse", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[2]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enterOld(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enter(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]})

    await this.purseStakingInstance.enter(purse("10"), {from: accounts[2]}) // User A stakes 10 purse
    const userABalAft = await this.purseTokenInstance.balanceOf(accounts[2])
    assert.equal(userABalAft, 0)
    const userAReceipt = await this.purseStakingInstance.userReceiptToken(accounts[2])
    assert.equal(userAReceipt, purse("7.5"))
    const userAPurseBal = await this.purseStakingInstance.getTotalPurse(accounts[2]) // Get user stake balance
    assert.equal(userAPurseBal, purse("30")) //7.5/12.5x50=30
    const receiptSupply = await this.purseStakingInstance.totalReceiptSupply()  // Get the total number of receipt 
    assert.equal(receiptSupply, purse("12.5")) //10/40x10+10=12.5
    const purseStakingBal = await this.purseStakingInstance.availablePurseSupply() // Get total purse in staking contract
    assert.equal(purseStakingBal, purse("50"))
    console.log("Total Purse: " + purseStakingBal.toString() + " Total Receipt: " + receiptSupply.toString())
  });

  it("Incoming 10 purse should return 70 purse", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[2]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enterOld(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enter(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]})
    await this.purseStakingInstance.enter(purse("10"), {from: accounts[2]}) // User A stakes 10 purse

    await this.purseTokenInstance.transfer(accounts[8], purse("40000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[9], purse("40000"), {from: accounts[8]}) 
    const purseStakingBal = await this.purseTokenInstance.balanceOf(this.purseStakingInstance.address)  //Total balance of purse in purse staking contract
    assert.equal(purseStakingBal, purse("70"))
    console.log("Total Purse: " + purseStakingBal.toString())
  });

  it("A withdraws 2 receipt should return 10.5 receipt and 58.8 purse (xPurse < OldReceipt)", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[2]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enterOld(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enterOld(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]})
    await this.purseStakingInstance.enter(purse("10"), {from: accounts[2]}) // User A stakes 10 purse
    await this.purseTokenInstance.transfer(accounts[8], purse("40000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[9], purse("40000"), {from: accounts[8]}) 
    
    await this.purseStakingInstance.leave(purse("2"), {from: accounts[2]}) //User A withdraws 2 receipt
    const userABalAft = await this.purseTokenInstance.balanceOf(accounts[2])
    assert.equal(userABalAft, purse("11.2")) //2/12.5x70=11.2
    const userAReceipt = await this.purseStakingInstance.userReceiptToken(accounts[2])
    assert.equal(userAReceipt, purse("5.5")) //7.5-2=5.5
    const userAPurseBal = await this.purseStakingInstance.getTotalPurse(accounts[2]) // Get user stake balance
    assert.equal(userAPurseBal, purse("30.8")) //5.5/10.5x58.8=30.8
    const receiptSupply = await this.purseStakingInstance.totalReceiptSupply()  // Get the total number of receipt 
    assert.equal(receiptSupply, purse("10.5")) //12.5-2=10.5
    const purseStakingBal = await this.purseStakingInstance.availablePurseSupply() // Get total purse in staking contract
    assert.equal(purseStakingBal, purse("58.8")) //70-11.2=58.8    
    console.log("Total Purse: " + purseStakingBal.toString() + " Total Receipt: " + receiptSupply.toString())
  });

  it("A withdraws 7 receipt should return 5.5 receipt and 30.8 purse (xPurse > OldReceipt)", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[2]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enterOld(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enterOld(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]})
    await this.purseStakingInstance.enter(purse("10"), {from: accounts[2]}) // User A stakes 10 purse
    await this.purseTokenInstance.transfer(accounts[8], purse("40000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[9], purse("40000"), {from: accounts[8]}) 

    await this.purseStakingInstance.leave(purse("7"), {from: accounts[2]}) //User A withdraws 7 receipt
    const userABalAft = await this.purseTokenInstance.balanceOf(accounts[2]) //5 old receipt and 5 new receipt
    assert.equal(userABalAft, purse("28")) //5/12.5x70=28
    const userAReceipt = await this.purseStakingInstance.userReceiptToken(accounts[2])
    assert.equal(userAReceipt, purse("0.5")) //7.5-7=0.5
    const userAPurseBal = await this.purseStakingInstance.getTotalPurse(accounts[2]) // Get user stake balance
    assert.equal(userAPurseBal, purse("2.8")) //0.5/5.5x30.8=2.8
    const lockedAmount = await this.purseStakingInstance.totalLockedAmount() // Get total amount in 21 Day Lock
    assert.equal(lockedAmount, purse("11.2")) //2/12.5x70=11.2
    const receiptSupply = await this.purseStakingInstance.totalReceiptSupply()  // Get the total number of receipt 
    assert.equal(receiptSupply, purse("5.5")) //12.5-7=5.5
    const purseStakingBal = await this.purseStakingInstance.availablePurseSupply() // Get total purse in staking contract
    assert.equal(purseStakingBal, purse("30.8")) //70-(7/12.5x70)=30.8
    console.log("Total Purse: " + purseStakingBal.toString() + " Total Receipt: " + receiptSupply.toString())
  });

  it("A claims >=21 Day Lock should return with reward (xPurse > OldReceipt)", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[2]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enterOld(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enterOld(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]})
    await this.purseStakingInstance.enter(purse("10"), {from: accounts[2]}) // User A stakes 10 purse
    await this.purseTokenInstance.transfer(accounts[8], purse("40000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[9], purse("40000"), {from: accounts[8]}) 
    await this.purseStakingInstance.leave(purse("7"), {from: accounts[2]}) //User A withdraws 7 receipt

    await time.increase(1814400) //21 days
    await this.purseStakingInstance.withdrawLockedAmount({from: accounts[2]})
    const userABalAft = await this.purseTokenInstance.balanceOf(accounts[2]) //5 old receipt and 5 new receipt
    assert.equal(userABalAft, purse("39.2")) //28+2/12.5x70=39.2
    const userAReceipt = await this.purseStakingInstance.userReceiptToken(accounts[2])
    assert.equal(userAReceipt, purse("0.5")) //7.5-7=0.5
    const userAPurseBal = await this.purseStakingInstance.getTotalPurse(accounts[2]) // Get user stake balance
    assert.equal(userAPurseBal, purse("2.8")) //0.5/5.5x30.8=2.8
    const lockedAmount = await this.purseStakingInstance.totalLockedAmount() // Get total amount in 21 Day Lock
    assert.equal(lockedAmount, purse("0"))
    const receiptSupply = await this.purseStakingInstance.totalReceiptSupply()  // Get the total number of receipt 
    assert.equal(receiptSupply, purse("5.5")) //12.5-7=5.5
    const purseStakingBal = await this.purseStakingInstance.availablePurseSupply() // Get total purse in staking contract
    assert.equal(purseStakingBal, purse("30.8")) //70-11.2-28=30.8
    console.log("Total Purse: " + purseStakingBal.toString() + " Total Receipt: " + receiptSupply.toString())
  });

  it("A withdraws 0.2 receipt after >=21 Day Lock should return with reward (xPurse > OldReceipt)", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[2]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enterOld(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enterOld(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]})
    await this.purseStakingInstance.enter(purse("10"), {from: accounts[2]}) // User A stakes 10 purse
    await this.purseTokenInstance.transfer(accounts[8], purse("40000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[9], purse("40000"), {from: accounts[8]}) 
    await this.purseStakingInstance.leave(purse("7"), {from: accounts[2]}) //User A withdraws 7 receipt
    await time.increase(1814400) //21 days

    await this.purseStakingInstance.leave(purse("0.2"), {from: accounts[2]}) //User A withdraws 0.2 receipt
    const userABalAft = await this.purseTokenInstance.balanceOf(accounts[2]) //5 old receipt and 5 new receipt
    assert.equal(userABalAft, purse("39.2")) //28+2/12.5x70=39.2
    const userAReceipt = await this.purseStakingInstance.userReceiptToken(accounts[2])
    assert.equal(userAReceipt, purse("0.3")) //7.5-7-0.2=0.3
    const userAPurseBal = await this.purseStakingInstance.getTotalPurse(accounts[2]) // Get user stake balance
    assert.equal(userAPurseBal, purse("1.68")) //0.3/5.3x29.68=1.68
    const lockedAmount = await this.purseStakingInstance.totalLockedAmount() // Get total amount in 21 Day Lock
    assert.equal(lockedAmount, purse("1.12")) //0.2/5.5x30.8=1.12
    const receiptSupply = await this.purseStakingInstance.totalReceiptSupply()  // Get the total number of receipt 
    assert.equal(receiptSupply, purse("5.3")) //12.5-7-0.2=5.3
    const purseStakingBal = await this.purseStakingInstance.availablePurseSupply() // Get total purse in staking contract
    assert.equal(purseStakingBal, purse("29.68")) //70-11.2-28-1.12=29.68
    console.log("Total Purse: " + purseStakingBal.toString() + " Total Receipt: " + receiptSupply.toString())
  });

  it("B claims 21 Day Lock should fail", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[2]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enterOld(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enterOld(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]})
    await this.purseStakingInstance.enter(purse("10"), {from: accounts[2]}) // User A stakes 10 purse
    await this.purseTokenInstance.transfer(accounts[8], purse("40000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[9], purse("40000"), {from: accounts[8]}) 
    await this.purseStakingInstance.leave(purse("7"), {from: accounts[2]}) //User A withdraws 7 receipt

    try {
      await this.purseStakingInstance.withdrawLockedAmount({from: accounts[5]})
      assert.fail("Should have thrown an error")
    } catch(error) {
      assert.include(error.message, "revert", "The error message should contain revert")
    }
  });

  it("B withdraws 2 receipt should return 3.5 receipt and 19.6 purse (OldReceipt == 0)", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[2]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enterOld(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enter(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]})
    await this.purseStakingInstance.enter(purse("10"), {from: accounts[2]}) // User A stakes 10 purse
    await this.purseTokenInstance.transfer(accounts[8], purse("40000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[9], purse("40000"), {from: accounts[8]}) 
    await this.purseStakingInstance.leave(purse("7"), {from: accounts[2]}) //User A withdraws 7 receipt

    await this.purseStakingInstance.leave(purse("2"), {from: accounts[5]}) //User B withdraws 2 receipt
    const userBBalAft = await this.purseTokenInstance.balanceOf(accounts[5]) //5 new receipt
    assert.equal(userBBalAft, purse("0"))
    const userBReceipt = await this.purseStakingInstance.userReceiptToken(accounts[5])
    assert.equal(userBReceipt, purse("3")) //5-2=3
    const userBPurseBal = await this.purseStakingInstance.getTotalPurse(accounts[5]) // Get user stake balance
    assert.equal(userBPurseBal, purse("16.8")) //3/3.5x19.6=16.8
    const lockedAmount = await this.purseStakingInstance.totalLockedAmount() // Get total amount in 21 Day Lock
    assert.equal(lockedAmount, purse("22.4")) //2/5.5x30.8+11.2=22.4
    const receiptSupply = await this.purseStakingInstance.totalReceiptSupply()  // Get the total number of receipt 
    assert.equal(receiptSupply, purse("3.5")) //5.5-2=3.5
    const purseStakingBal = await this.purseStakingInstance.availablePurseSupply() // Get total purse in staking contract
    assert.equal(purseStakingBal, purse("19.6")) //30.8-(2/5.5x30.8)=19.6
    console.log("Total Purse: " + purseStakingBal.toString() + " Total Receipt: " + receiptSupply.toString())
  });

  it("B withdraws 2 receipt followed by 0.2 receipt (OldReceipt == 0)", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[2]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enterOld(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enter(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]})
    await this.purseStakingInstance.enter(purse("10"), {from: accounts[2]}) // User A stakes 10 purse
    await this.purseTokenInstance.transfer(accounts[8], purse("40000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[9], purse("40000"), {from: accounts[8]}) 
    await this.purseStakingInstance.leave(purse("7"), {from: accounts[2]}) //User A withdraws 7 receipt

    await this.purseStakingInstance.leave(purse("2"), {from: accounts[5]}) //User B withdraws 2 receipt
    await this.purseStakingInstance.leave(purse("0.2"), {from: accounts[5]}) //User B withdraws 0.2 receipt

    const userBBalAft = await this.purseTokenInstance.balanceOf(accounts[5]) //5 new receipt
    assert.equal(userBBalAft, purse("0"))
    const userBReceipt = await this.purseStakingInstance.userReceiptToken(accounts[5])
    assert.equal(userBReceipt, purse("2.8")) //5-2.2=2.8
    const userBPurseBal = await this.purseStakingInstance.getTotalPurse(accounts[5]) // Get user stake balance
    assert.equal(userBPurseBal, purse("15.68")) //2.8/3.3x18.48=15.68
    const lockedAmount = await this.purseStakingInstance.totalLockedAmount() // Get total amount in 21 Day Lock
    assert.equal(lockedAmount, purse("23.52")) //2.2/5.5x30.8+11.2=23.52
    const receiptSupply = await this.purseStakingInstance.totalReceiptSupply()  // Get the total number of receipt 
    assert.equal(receiptSupply, purse("3.3")) //5.5-2-0.2=3.3
    const purseStakingBal = await this.purseStakingInstance.availablePurseSupply() // Get total purse in staking contract
    assert.equal(purseStakingBal, purse("18.48")) //30.8-(2/5.5x30.8)-(0.2/3.5x19.6)=18.48
    console.log("Total Purse: " + purseStakingBal.toString() + " Total Receipt: " + receiptSupply.toString())
  });

  it("B claims >=21 Day Lock should return with reward (OldReceipt == 0)", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[2]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enterOld(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enter(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]})
    await this.purseStakingInstance.enter(purse("10"), {from: accounts[2]}) // User A stakes 10 purse
    await this.purseTokenInstance.transfer(accounts[8], purse("40000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[9], purse("40000"), {from: accounts[8]}) 
    await this.purseStakingInstance.leave(purse("7"), {from: accounts[2]}) //User A withdraws 7 receipt
    await this.purseStakingInstance.leave(purse("2"), {from: accounts[5]}) //User B withdraws 2 receipt
    
    await time.increase(1814400) //21 days
    await this.purseStakingInstance.withdrawLockedAmount({from: accounts[5]})
    const userBBalAft = await this.purseTokenInstance.balanceOf(accounts[5]) //5 new receipt
    assert.equal(userBBalAft, purse("11.2")) //2/5.5x30.8=11.2
    const userBReceipt = await this.purseStakingInstance.userReceiptToken(accounts[5])
    assert.equal(userBReceipt, purse("3")) //5-2=3
    const userBPurseBal = await this.purseStakingInstance.getTotalPurse(accounts[5]) // Get user stake balance
    assert.equal(userBPurseBal, purse("16.8")) //3/3.5x19.6=16.8
    const lockedAmount = await this.purseStakingInstance.totalLockedAmount() // Get total amount in 21 Day Lock
    assert.equal(lockedAmount, purse("11.2")) //11.2
    const receiptSupply = await this.purseStakingInstance.totalReceiptSupply()  // Get the total number of receipt 
    assert.equal(receiptSupply, purse("3.5")) //5.5-2=3.5
    const purseStakingBal = await this.purseStakingInstance.availablePurseSupply() // Get total purse in staking contract
    assert.equal(purseStakingBal, purse("19.6")) //30.8-11.2=19.6
    console.log("Total Purse: " + purseStakingBal.toString() + " Total Receipt: " + receiptSupply.toString())
  });

  it("B claims 21 Day Lock should fail after claiming (OldReceipt == 0)", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[2]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enterOld(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enter(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]})
    await this.purseStakingInstance.enter(purse("10"), {from: accounts[2]}) // User A stakes 10 purse
    await this.purseTokenInstance.transfer(accounts[8], purse("40000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[9], purse("40000"), {from: accounts[8]}) 
    await this.purseStakingInstance.leave(purse("7"), {from: accounts[2]}) //User A withdraws 7 receipt
    await this.purseStakingInstance.leave(purse("2"), {from: accounts[5]}) //User B withdraws 2 receipt
    await time.increase(1814400) //21 days
    await this.purseStakingInstance.withdrawLockedAmount({from: accounts[5]})

    try {
      await this.purseStakingInstance.withdrawLockedAmount({from: accounts[5]})
      assert.fail("Should have thrown an error")
    } catch(error) {
      assert.include(error.message, "revert", "The error message should contain revert")
    }
  });

  it("B claims >=10 Day Lock should return with reward after update Lock Period", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[2]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enterOld(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enter(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]})
    await this.purseStakingInstance.enter(purse("10"), {from: accounts[2]}) // User A stakes 10 purse
    await this.purseTokenInstance.transfer(accounts[8], purse("40000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[9], purse("40000"), {from: accounts[8]}) 
    await this.purseStakingInstance.leave(purse("7"), {from: accounts[2]}) //User A withdraws 7 receipt
    await this.purseStakingInstance.leave(purse("2"), {from: accounts[5]}) //User B withdraws 2 receipt
    
    await this.purseStakingInstance.updateLockPeriod(864000)
    await time.increase(864000) //10 days
    await this.purseStakingInstance.withdrawLockedAmount({from: accounts[5]})
    const userBBalAft = await this.purseTokenInstance.balanceOf(accounts[5]) //5 new receipt
    assert.equal(userBBalAft, purse("11.2")) //2/5.5x30.8=11.2
    const userBReceipt = await this.purseStakingInstance.userReceiptToken(accounts[5])
    assert.equal(userBReceipt, purse("3")) //5-2=3
    const userBPurseBal = await this.purseStakingInstance.getTotalPurse(accounts[5]) // Get user stake balance
    assert.equal(userBPurseBal, purse("16.8")) //3/3.5x19.6=16.8
    const lockedAmount = await this.purseStakingInstance.totalLockedAmount() // Get total amount in 21 Day Lock
    assert.equal(lockedAmount, purse("11.2")) //11.2
    const receiptSupply = await this.purseStakingInstance.totalReceiptSupply()  // Get the total number of receipt 
    assert.equal(receiptSupply, purse("3.5")) //5.5-2=3.5
    const purseStakingBal = await this.purseStakingInstance.availablePurseSupply() // Get total purse in staking contract
    assert.equal(purseStakingBal, purse("19.6")) //30.8-11.2=19.6
    console.log("Total Purse: " + purseStakingBal.toString() + " Total Receipt: " + receiptSupply.toString())
  });

  it("B withdraws 0.2 receipt after >=21 Day Lock should return with reward (OldReceipt == 0)", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[2]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enterOld(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enter(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]})
    await this.purseStakingInstance.enter(purse("10"), {from: accounts[2]}) // User A stakes 10 purse
    await this.purseTokenInstance.transfer(accounts[8], purse("40000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[9], purse("40000"), {from: accounts[8]}) 
    await this.purseStakingInstance.leave(purse("7"), {from: accounts[2]}) //User A withdraws 7 receipt
    await this.purseStakingInstance.leave(purse("2"), {from: accounts[5]}) //User B withdraws 2 receipt
    
    await time.increase(1814400) //21 days
    await this.purseStakingInstance.leave(purse("0.2"), {from: accounts[5]}) //User B withdraws 0.2 receipt

    const userBBalAft = await this.purseTokenInstance.balanceOf(accounts[5]) //5 new receipt
    assert.equal(userBBalAft, purse("11.2"))
    const userBReceipt = await this.purseStakingInstance.userReceiptToken(accounts[5])
    assert.equal(userBReceipt, purse("2.8")) //5-2.2=2.8
    const userBPurseBal = await this.purseStakingInstance.getTotalPurse(accounts[5]) // Get user stake balance
    assert.equal(userBPurseBal, purse("15.68")) //2.8/3.3x18.48=15.68
    const lockedAmount = await this.purseStakingInstance.totalLockedAmount() // Get total amount in 21 Day Lock
    assert.equal(lockedAmount, purse("12.32")) //2.2/5.5x30.8=12.32
    const receiptSupply = await this.purseStakingInstance.totalReceiptSupply()  // Get the total number of receipt 
    assert.equal(receiptSupply, purse("3.3")) //5.5-2-0.2=3.3
    const purseStakingBal = await this.purseStakingInstance.availablePurseSupply() // Get total purse in staking contract
    assert.equal(purseStakingBal, purse("18.48")) //30.8-(2/5.5x30.8)-(0.2/3.5x19.6)=18.48
    console.log("Total Purse: " + purseStakingBal.toString() + " Total Receipt: " + receiptSupply.toString())
  });

});

