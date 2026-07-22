import { ethers } from "ethers";

const RPC_URL = process.env.BSC_TESTNET_RPC!;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS!;

// ABI minimal untuk fungsi yang dibutuhkan
const GACHARD_ABI = [
  "function mintCard(address to, uint8 rarity) external returns (uint256 tokenId)",
  "function cardStatus(uint256 tokenId) external view returns (uint8)",
  "function cardRarity(uint256 tokenId) external view returns (uint8)",
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "event CardMinted(uint256 indexed tokenId, address indexed to, uint8 status, uint8 rarity)",
];

export function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

export function getAdminWallet() {
  const provider = getProvider();
  const privateKey = process.env.ADMIN_PRIVATE_KEY!;
  return new ethers.Wallet(privateKey, provider);
}

export function getContract(signer?: ethers.Signer) {
  const s = signer || getAdminWallet();
  return new ethers.Contract(CONTRACT_ADDRESS, GACHARD_ABI, s);
}

export async function mintCard(toAddress: string, rarity: number): Promise<string> {
  const contract = getContract();
  const tx = await contract.mintCard(toAddress, rarity);
  return tx.hash;
}

export async function getCardStatus(tokenId: number): Promise<number> {
  const contract = getContract();
  return contract.cardStatus(tokenId);
}

export async function getCardRarity(tokenId: number): Promise<number> {
  const contract = getContract();
  return contract.cardRarity(tokenId);
}

export async function getBalance(address: string, tokenId: number): Promise<bigint> {
  const contract = getContract();
  return contract.balanceOf(address, tokenId);
}
