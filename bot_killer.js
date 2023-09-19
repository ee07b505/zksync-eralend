const ethers = require('ethers');
const rpc_url = "https://rpc.ankr.com/base"
const provider = new ethers.providers.JsonRpcProvider(rpc_url);
const privateFile = 'private.txt'
const fs = require('fs');
const pdata = fs.readFileSync(privateFile, 'utf8');
const dotenv = require('dotenv');
dotenv.config();
const pdata_array = pdata.split("\n");
const wallet_privatekeys = pdata_array.filter(Boolean)
const contractAddress = '0xCF205808Ed36593aa40a44F10c7f7C2F67d4A4d4';
const contractABI = JSON.parse(fs.readFileSync('contractABI.json', 'utf8'));
const contract = new ethers.Contract(contractAddress, contractABI, provider);
const gasPrice = ethers.utils.parseUnits('0.109362757', 'gwei');
const BUY_PRICE_LIMIT = 5000000000000000n; // in wei 

//   If no wallet found in wallet_privatekeys , use specified private key  
//   Find   wallet  balance > 0.001 eth in  wallet_privatekeys ,begin with last one of the array, return the first one found
//   If specified private key is used, it will be saved to private.txt

(async () => {
let lastPrivateKey;
let beginWallet;
for (let i = wallet_privatekeys.length-1; i >=0; i--) {
    const privateKey = JSON.parse(wallet_privatekeys[i]).privateKey 
    console.log("Checking address balance")
    if (await checkBalance(privateKey)) {
        lastPrivateKey = privateKey;
        console.log("Suitable PrivateKey  found")
        break;
    }
}
const specifiedPrivateKey = process.env.PRIVATE_KEY // 指定的私钥
const beginPrivatekey = lastPrivateKey?lastPrivateKey:specifiedPrivateKey 
beginWallet = new ethers.Wallet(beginPrivatekey, provider);
await bot_killer(beginWallet);
//await sell_twice(beginPrivatekey);
//await transfer_funds(beginPrivatekey,specifiedPrivateKey)
    
})();


function sleep(seconds) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}


async function chechMainnetGasPrice() {
    const eth_url ="https://rpc.ankr.com/eth"
    const eth_provider = new ethers.providers.JsonRpcProvider(eth_url);
    const eth_gasPrice = await eth_provider.getGasPrice()
    console.log("eth_gasPrice is", ethers.utils.formatUnits(eth_gasPrice.toString(),"gwei").toString())
    // if gasPrice smaller than 10 gwei, return true
    if (eth_gasPrice < 10000000000n) {
        return false;
    }
    else {
        return true;
    }
}

async function checkBalance(privateKey) {
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await wallet.getBalance();
    //if balance in ether > 0.001,return  true  else  return false 
    if (balance > 1000000000000000n) {
        console.log("Wallet found, it is",wallet.address)
        return true;
    }
    else {
        console.log("Wallet not found")
        return false;


}
}



 async function generate_NEW_Wallet() {
    const wallet = ethers.Wallet.createRandom();
    const privateKeyNEW = wallet.privateKey;
    const address = wallet.address;
    const data = {address,privateKey:privateKeyNEW };
    const data_json = JSON.stringify(data);
    fs.appendFileSync('private.txt', data_json + "\n");  
    return new ethers.Wallet(privateKeyNEW, provider);
 }


async function buyShares(wallet,subjectAddress, sharesToBuy) {
    const qty = BigInt(sharesToBuy);
    const contractWithSigner = contract.connect(wallet);
    const buyPrice = await contractWithSigner.getBuyPriceAfterFee(subjectAddress, qty);

    console.log(`Buy price: ${buyPrice}`);

    //return; // testing to this point

    if(buyPrice >= BUY_PRICE_LIMIT) {
        console.log(`Buy canceled, price too high`);
        return true;
    }

    try {
        const tx = await contractWithSigner.buyShares(subjectAddress, qty, { value: buyPrice, gasPrice });
        const receipt = await tx.wait();
        console.log(`https://basescan.org/tx/${receipt.transactionHash}` );

        return false;
    } catch (err) {
        console.error(`Failed to buy shares for ${subjectAddress}: ${err.message}`);
    }

}

async function sellShares(wallet,subjectAddress, sharesToSell) {
    const qty = BigInt(sharesToSell);
    const contractWithSigner = contract.connect(wallet);
    const sellPrice = await contractWithSigner.getSellPriceAfterFee(subjectAddress, qty);

    console.log(`当前key的售价为: ${sellPrice}`);

    //return; // testing to this point

    if(sellPrice == 0) {
        console.log(`price is 0, no need to sell`);
        return true;
    }

    try {
        const tx = await contractWithSigner.sellShares(subjectAddress, qty, { gasPrice,value:0 });
        const receipt = await tx.wait();
        console.log(`https://basescan.org/tx/${receipt.transactionHash}` );
        const balance = await wallet.getBalance();
        console.log("钱包地址"+wallet.address+" balance :"+ethers.utils.formatEther(balance));

        return false;
    } catch (err) {
        console.error(`Failed to sell shares for ${subjectAddress}: ${err.message}`);
    }
}


async function transfer_ETH_to_other_wallet(from,to,amount) {
    try {
    const base_provider = provider
    const base_gasPrice =  await base_provider.getGasPrice()
    console.log("base_gasPrice is", ethers.utils.formatUnits(base_gasPrice.toString(),"gwei").toString())
    const eth_gas = ethers.utils.parseUnits('0.15', 'gwei');
    const gas_estimate = 21000
    console.log("gas estimate is", gas_estimate.toString())
    const gas_fee = ethers.utils.parseEther("0.000025")
    //const gas_fee = ethers.BigNumber.from(eth_gas.toString()).mul(gas_estimate);
    console.log("gas fee is", ethers.utils.formatEther(gas_fee.toString()).toString())
    const fromWallet = from.connect(provider);
    const toWallet= to.connect(provider);
    const balance = await fromWallet.getBalance();
    console.log(fromWallet.address+" balance :"+ethers.utils.formatEther(balance));
    let tx
    if (amount== -1){
     tx = {
        to: toWallet.address,
        value: balance.sub(gas_fee),
        gasLimit: gas_estimate,
        gasPrice: eth_gas
    };}
    if(amount > 0){
         tx = {
            to: toWallet.address,
            value: ethers.utils.parseEther(amount.toString()),
            gasLimit: gas_estimate,
            gasPrice: eth_gas
        };
    }
    const txResponse = await fromWallet.sendTransaction(tx);
    const txReceipt = await txResponse.wait();
    console.log(`https://basescan.org/tx/${txReceipt.transactionHash}` );
    const balance2 = await fromWallet.getBalance();
    console.log(fromWallet.address+" balance :"+ethers.utils.formatEther(balance2));
    const balance3 = await toWallet.getBalance();
    console.log(" => "+toWallet.address+" balance :"+ethers.utils.formatEther(balance3));
    if (balance3 > 0) {
        return toWallet;
    }

    return fromWallet;
    } catch (err) {
        console.error(`Failed to transfer ETH : ${err.message}`);
    }




}

async function bot_killer(beginWallet){
    let fromWallet= beginWallet;
    while(true){
    if (await chechMainnetGasPrice()){
        console.log("Gas price too high, wait 60 seconds")
        await sleep(60);
        continue;
    }
    let toWallet= await generate_NEW_Wallet();
    let sniperWallet= await transfer_ETH_to_other_wallet(fromWallet,toWallet,-1);
    if (!sniperWallet){continue;}
    await buyShares(sniperWallet,sniperWallet.address, 1);
    await sleep(2);
    if(await sellShares(sniperWallet,sniperWallet.address, 1)){
        const seconds = 120;
        console.log(`没人上钩，休息${seconds}秒,请在此刻退出程序`);
        await sleep(seconds);

    }
    fromWallet=sniperWallet;

    }


}

async function sell_twice(privateKey) {
    const sniperWallet = new ethers.Wallet(privateKey,provider)
    await sellShares(sniperWallet,sniperWallet.address, 1);
}
async function transfer_funds(senderKey,receiptKey){
    const senderWallet = new ethers.Wallet(senderKey,provider)
    const toWallet = new ethers.Wallet(receiptKey,provider)
    await transfer_ETH_to_other_wallet(senderWallet,toWallet,0.015);

}



