const { ethers } = require('ethers');

// Contract address
const CONTRACT_ADDRESS = '0x3E1Cf18D6b94A4aCC438176b87E1387280aC87d4';

// RPC URL
const RPC_URL = 'https://bsc-testnet.bnbchain.org';

// Minimal ABI
const ABI = [
  "function nextTokenId() external view returns (uint256)",
  "function cardStatus(uint256 tokenId) external view returns (uint8)",
  "function cardRarity(uint256 tokenId) external view returns (uint8)",
];

async function main() {
  try {
    console.log('Checking contract at:', CONTRACT_ADDRESS);
    console.log('RPC URL:', RPC_URL);
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    
    // Check nextTokenId
    const nextTokenId = await contract.nextTokenId();
    console.log('nextTokenId:', nextTokenId.toString());
    
    // Check card status for token 1
    const status = await contract.cardStatus(1);
    console.log('cardStatus(1):', status.toString());
    
    // Check card rarity for token 1
    const rarity = await contract.cardRarity(1);
    console.log('cardRarity(1):', rarity.toString());
    
    console.log('Contract is accessible and working!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
