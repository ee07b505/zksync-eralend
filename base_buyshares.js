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

function sleep(seconds) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
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
        console.log(`Transaction successful with hash: ${receipt.transactionHash}`);
        return false;
    } catch (err) {
        console.error(`Failed to buy shares for ${subjectAddress}: ${err.message}`);
    }

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
batch_buy();