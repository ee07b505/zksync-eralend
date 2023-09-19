const ethers = require('ethers');
const rpc_url = "https://rpc.ankr.com/base"
const provider = new ethers.providers.JsonRpcProvider(rpc_url);
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const specifiedPrivateKey = process.env.PRIVATE_KEY; // 指定的私钥
if (!specifiedPrivateKey) {
    console.error('私钥未配置在.env文件中');
    process.exit(1);
}
(async () => {
    const subjectAddress = "";
    await buyShares(subjectAddress, 3);
})();

function sleep(seconds) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}


async function buyShares(subjectAddress, sharesToBuy) {
    const wallet = new ethers.Wallet(specifiedPrivateKey, provider);
    console.log(`Buying ${sharesToBuy} shares for ${subjectAddress}  by ${wallet.address}`);
    const qty = BigInt(sharesToBuy);
    const contractAddress = '0xCF205808Ed36593aa40a44F10c7f7C2F67d4A4d4';
    const contractABI = JSON.parse(fs.readFileSync('contractABI.json', 'utf8'));
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    const gasPrice = ethers.utils.parseUnits('0.1', 'gwei');
    const data = contract.interface.encodeFunctionData('buyShares', [subjectAddress, qty]);
    const buyPrice2 = ethers.utils.parseUnits('0.0009625', 'ether');
    const gasLimit = "100000";
    const contractWithSigner = contract.connect(wallet);
    // const buyPrice = await contractWithSigner.getBuyPriceAfterFee(subjectAddress, qty);
    // console.log(`Buy price: ${ethers.utils.formatEther(buyPrice.toString()).toString()}`);
    // const sellPrice = await contractWithSigner.getSellPriceAfterFee(subjectAddress, 1);
    // console.log(`Sell price: ${ethers.utils.formatEther(sellPrice.toString()).toString()}`);

    try {
        const   txParams = {
            value: buyPrice2,
            data: data,
            to: contractAddress,
            gasPrice,
            gasLimit,
          };
        // try  to buy shares in a loop until success
        let hash;
        while (true) {
            let num = 0;
            try {
                 hash = await wallet.sendTransaction(txParams)
            } catch (err) {
                console.error(`Failed to buy shares for ${subjectAddress}: ${err.message}`);
                await sleep(0.5);
                num++;
                if (num > 4) {break;}
                continue;}

            }        

        console.log(`Successfully bought ${sharesToBuy} shares for ${subjectAddress}`);
        console.log(`https://basescan.org/tx/${hash.hash}` );
    } catch (err) {
        console.error(`Failed to buy shares for ${subjectAddress}: ${err.message}`);
    }

}
