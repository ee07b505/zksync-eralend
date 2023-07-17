const ethers = require('ethers');
const zksync = require('zksync-web3');
const ZKSYNC_ERA_URL = "https://rpc.ankr.com/zksync_era"
const zk_provier = new zksync.Provider(ZKSYNC_ERA_URL)
const eth_provier = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/e014a014a2c0479e957e62810307114b")
const privateFile = 'private.txt'
const fs = require('fs');
const pdata = fs.readFileSync(privateFile, 'utf8');
const pdata_array = pdata.split("\n");
const wallet_privatekeys = pdata_array.filter(Boolean)



function sleep(seconds) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}







  async function eraLend_deposit(amount,wallet) {

    const abi = [
    'function balanceOf(address owner) external view returns (uint256)',
    'function getCash() external view returns (uint256)',
    'function mint() external payable returns (uint)',
    'function redeemUnderlying(uint redeemAmount) external returns (uint)'
];
    const contractAddress = '0x1BbD33384869b30A323e15868Ce46013C82B86FB';

    try {

        console.time('EraLend');
        // 创建钱包
        const contract = new zksync.Contract(contractAddress, abi, wallet);
        const ethBalance = await wallet.getBalance(ethers.constants.AddressZero);
        console.log('ETH 余额', ethers.utils.formatEther(ethBalance));

        // 获取 nETH
        let nETHBalance = await contract.balanceOf(wallet.address);

        
        if (ethBalance.gt(amount)) {
            console.log('EraLend 充值', `${ethers.utils.formatEther(amount)} ETH`);
            let gasLimit = await contract.estimateGas.mint({ value: amount });
            gasLimit = gasLimit.mul(6).div(10); // 60% gas limit
            let response = await contract.mint({ value: amount, gasLimit });
            let tx = await response.wait();
            console.log('EraLend 充值成功', tx.transactionHash);
            console.timeEnd('EraLend');
            return tx.transactionHash;
            }
        console.log("EraLend ETH 没有足够余额可供充值")
    } catch (error) {
        console.log(error);
    }
}


async function eralend_enterMarkets(wallet) {
    const abi = [{
        "constant": false,
        "inputs": [{
            "internalType": "address[]",
            "name": "cTokens",
            "type": "address[]"
        }],
        "name": "enterMarkets",
        "outputs": [{
            "internalType": "uint256[]",
            "name": "",
            "type": "uint256[]"
        }],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    }]
    const contractAddress = '0x0171cA5b372eb510245F5FA214F5582911934b3D';
    const cTokens =['0x1BbD33384869b30A323e15868Ce46013C82B86FB']
    try {
    const contract = new zksync.Contract(contractAddress, abi, wallet);
    let response = await contract.enterMarkets(cTokens);
    let tx = await response.wait();
    console.log('EraLend 进入市场充当抵押物成功', tx.transactionHash);
    return tx.transactionHash;
    }catch (error) {
        console.log(error);
    }
}


async function eralend_borrow(borrowAmount,wallet) {
    const abi = [{
        "constant": false,
        "inputs": [{
            "internalType": "uint256",
            "name": "borrowAmount",
            "type": "uint256"
        }],
        "name": "borrow",
        "outputs": [{
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
        }],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    }]
    const contractAddress = '0x1BbD33384869b30A323e15868Ce46013C82B86FB';
    try {
    const contract = new zksync.Contract(contractAddress, abi, wallet);
    let gasLimit = await contract.estimateGas.borrow(borrowAmount);
    gasLimit = gasLimit.mul(6).div(10); // 60% gas limit
    let response = await contract.borrow(borrowAmount, { gasLimit });
    let tx = await response.wait();
    console.log('EraLend 借款成功', tx.transactionHash);
    return tx.transactionHash;
    }
    catch (error) {
        console.log(error);
    }
}
async function main(){
    wallet_privatekeys.forEach(async function(privatekey){
        const wallet = new zksync.Wallet(privatekey, zk_provier,eth_provier);
        const deposit_amount = ethers.utils.parseEther("0.03");
        const borrow_amount = ethers.utils.parseEther("0.017");
        // which address begin to deposit and borrow 
        console.log(`wallet address: ${wallet.address} begin to deposit ${ethers.utils.format(deposit_amount)}  \n`);
        const deposit_tx =await eraLend_deposit(deposit_amount,wallet);
        console.log(`执行成功 https://explorer.zksync.io/tx/${deposit_tx}} \n`);
        await sleep(2);
        console.log(`wallet address: ${wallet.address} begin to enter market \n`);
        const enterMarket_tx =await eralend_enterMarkets(wallet);
        console.log(`执行成功 https://explorer.zksync.io/tx/${enterMarket_tx}} \n`);
        await sleep(2);
        console.log(`wallet address: ${wallet.address} begin to  borrow ${ethers.utils.format(borrow_amount)} \n`);
        const borrow_tx =await eralend_borrow(borrow_amount,wallet);
        console.log(`执行成功 https://explorer.zksync.io/tx/${borrow_tx}} \n`);
        await sleep(2);

    }
    )
}
main()



