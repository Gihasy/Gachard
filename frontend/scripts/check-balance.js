const { ethers } = require('ethers');

// Admin wallet address
const ADMIN_WALLET = '0x3F4CBDCb5bFb014d63C07400DcD11513DB5F7b56';

// RPC URL
const RPC_URL = 'https://bsc-testnet.bnbchain.org';

async function main() {
  try {
    console.log('Checking balance for:', ADMIN_WALLET);
    console.log('RPC URL:', RPC_URL);
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Get balance
    const balance = await provider.getBalance(ADMIN_WALLET);
    const balanceInBNB = ethers.formatEther(balance);
    
    console.log('Balance:', balanceInBNB, 'BNB');
    console.log('Balance (wei):', balance.toString());
    
    if (parseFloat(balanceInBNB) > 0) {
      console.log('✅ Admin wallet has BNB for gas fees');
    } else {
      console.log('❌ Admin wallet has NO BNB - needs faucet');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
