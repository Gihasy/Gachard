import { MongoClient, ObjectId } from "mongodb";
import { ethers } from "ethers";

const MONGODB_URL = "mongodb+srv://gihasy:%23Gihasy2811@gachard-cluster.4ttukup.mongodb.net/gachard?retryWrites=true&w=majority";
const RPC_URL = "https://bsc-testnet-rpc.publicnode.com";
const CONTRACT = "0x0bb3dd543ff752bd15a50cbb3cba059bea6a278a";
const CARD_MINTED_TOPIC = ethers.id("CardMinted(uint256,address,uint8,uint8)");

async function confirm() {
  const client = new MongoClient(MONGODB_URL);
  await client.connect();
  const db = client.db("gachard");

  const txs = await db.collection("transactions").find({ status: "pending" }).toArray();
  console.log(`Found ${txs.length} pending transactions\n`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  for (const tx of txs) {
    if (!tx.txHash) { console.log(`  tx ${tx._id}: no txHash, skipping`); continue; }
    console.log(`  tx ${tx._id}: checking ${tx.txHash}`);

    const receipt = await provider.getTransactionReceipt(tx.txHash);
    if (!receipt) { console.log("    no receipt yet"); continue; }
    console.log(`    status: ${receipt.status}, logs: ${receipt.logs.length}`);

    if (receipt.status === 1) {
      const tokenIds = [];
      for (const log of receipt.logs) {
        if (log.topics[0] === CARD_MINTED_TOPIC && log.address.toLowerCase() === CONTRACT.toLowerCase()) {
          const tokenId = parseInt(log.topics[1], 16);
          const logData = log.data.slice(2);
          const rarity = parseInt(logData.slice(64, 128), 16);
          tokenIds.push(tokenId);
          console.log(`    minted tokenId=${tokenId} rarity=${rarity}`);
        }
      }

      const cards = await db.collection("cards").find({ txId: tx._id.toString() }).toArray();
      for (let i = 0; i < cards.length && i < tokenIds.length; i++) {
        await db.collection("cards").updateOne({ _id: cards[i]._id }, { $set: { tokenId: tokenIds[i], status: "Digital", rarity: parseInt(String(tokenIds[i])) || cards[i].rarity } });
        console.log(`    card ${cards[i].cardId} -> tokenId ${tokenIds[i]}`);
      }

      await db.collection("transactions").updateOne({ _id: tx._id }, { $set: { status: "confirmed", tokenIds } });
      console.log("    confirmed!");
    } else {
      await db.collection("transactions").updateOne({ _id: tx._id }, { $set: { status: "failed" } });
      console.log("    failed on-chain");
    }
  }

  await client.close();
}

confirm().catch(console.error);
