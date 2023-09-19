const ethers = require('ethers');
const rpc_url = "https://rpc.ankr.com/base"
const provider = new ethers.providers.JsonRpcProvider(rpc_url);
const privateFile = 'private.txt'
const fs = require('fs');
const pdata = fs.readFileSync(privateFile, 'utf8');
const pdata_array = pdata.split("\n");
const wallet_privatekeys = pdata_array.filter(Boolean)
const contractAddress = '0xCF205808Ed36593aa40a44F10c7f7C2F67d4A4d4';
const contractABI = JSON.parse(fs.readFileSync('contractABI.json', 'utf8'));
const contract = new ethers.Contract(contractAddress, contractABI, provider);
const gasPrice = ethers.utils.parseUnits('0.109362757', 'gwei');
const BUY_PRICE_LIMIT = 5000000000000000n; // in wei     
const privateKey =""
let sniperWallet = new ethers.Wallet(privateKey, provider);
function sleep(seconds) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

// The function generate new privateKey and store in the private.txt as json format

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

    console.log(`Sell price: ${sellPrice}`);

    //return; // testing to this point

    if(sellPrice = 0) {
        console.log(`Sell canceled, price too low`);
        return true;
    }

    try {
        const tx = await contractWithSigner.sellShares(subjectAddress, qty, { gasPrice,value:0 });
        const receipt = await tx.wait();
        console.log(`https://basescan.org/tx/${receipt.transactionHash}` );

        return false;
    } catch (err) {
        console.error(`Failed to sell shares for ${subjectAddress}: ${err.message}`);
    }
}


async function transfer_All_ETH_to_other_wallet(from,to) {
    const base_provider = provider
    const eth_gas = ethers.utils.parseUnits('0.1', 'gwei');
    console.log("eth_gas is", ethers.utils.formatEther(eth_gas.toString()))
    const gas_estimate = 21000
    console.log("gas estimate is", gas_estimate.toString())
    //const gas_fee = ethers.utils.parseEther("0.000048")
    const gas_fee = ethers.BigNumber.from(eth_gas.toString()).mul(gas_estimate);
    const fromWallet = from.connect(provider);
    const toWallet= to.connect(provider);
    const balance = await fromWallet.getBalance();
    console.log(fromWallet.address+" balance :"+ethers.utils.formatEther(balance));
    const tx = {
        to: toWallet.address,
        value: balance.sub(gas_fee),
        gasLimit: gas_estimate,
        gasPrice: eth_gas
    };
    const txResponse = await fromWallet.sendTransaction(tx);
    const txReceipt = await txResponse.wait();
    console.log(`https://basescan.org/tx/${txReceipt.transactionHash}` );
    const balance2 = await fromWallet.getBalance();
    console.log(fromWallet.address+" balance :"+ethers.utils.formatEther(balance2));
    const balance3 = await toWallet.getBalance();
    console.log(" => "+toWallet.address+" balance :"+ethers.utils.formatEther(balance3));
    if (balance3 > 0) {
        sniperWallet =to;
    }

    return txReceipt;

}

async function bot_killer(){
    let toWallet= await generate_NEW_Wallet();
    await transfer_All_ETH_to_other_wallet(sniperWallet,toWallet);
    await buyShares(sniperWallet,sniperWallet.address, 1);
    await sleep(2);
    await sellShares(sniperWallet,sniperWallet.address, 1);


}




async function batch_buy() {
    for (let i = 0; i < wallet_privatekeys.length; i++) {
        const wallet_subject = new ethers.Wallet(wallet_privatekeys[i], provider);
        const subjectAddress = wallet_subject.address;
        const wallet_privatekeys_other = wallet_privatekeys.filter(function (item) {
            return item !== wallet_privatekeys[i]
        })
        const  wallet_privatekeys_other_length = wallet_privatekeys_other.length;                   
            for (let k = 0; k < wallet_privatekeys_other_length; k++) {
            const index = (i + k+5) % wallet_privatekeys_other_length;
            const wallet_buyer = new ethers.Wallet(wallet_privatekeys[index], provider);
            const sharesToBuy = 1;
            if(await buyShares(wallet_buyer,subjectAddress, sharesToBuy)){
                break;
            }
            await sleep(1);
        }
    }



}


// async function single_buy() {
//     const privatekey = "";
//     const wallet_buyer = new ethers.Wallet(privatekey, provider);
//     //show buyer balance
//     const balance = await wallet_buyer.getBalance();
//     console.log(ethers.utils.formatEther(balance));
//     console.log(wallet_buyer.address);

//     const privatekey_subject = "";
//     const wallet_subject = new ethers.Wallet(privatekey_subject, provider);
//     const subjectAddress = wallet_subject.address;
//     const sharesToBuy = 1;
//     await buyShares(wallet_buyer,subjectAddress, sharesToBuy);
//     await sleep(15);




// }
bot_killer();