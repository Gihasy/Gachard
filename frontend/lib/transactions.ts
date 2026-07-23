import { getCollection } from "./mongodb";
import { ObjectId } from "mongodb";
import { getProvider } from "./blockchain";
import { ethers } from "ethers";

export type TxStatus = "pending" | "confirmed" | "failed";

export interface Transaction {
  _id?: ObjectId;
  userId: string;
  type: "mint" | "print" | "redeem" | "transfer";
  tokenId?: number;
  rarity?: number;
  txHash: string | null;
  status: TxStatus;
  fromAddress: string;
  toAddress: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// CardMinted(uint256 indexed tokenId, address indexed to, uint8 status, uint8 rarity)
const CARD_MINTED_TOPIC = ethers.id("CardMinted(uint256,address,uint8,uint8)");

/**
 * Create a new pending transaction record.
 * Called immediately after submitting a tx to the chain.
 */
export async function createTransaction(
  tx: Omit<Transaction, "_id" | "status" | "txHash" | "createdAt" | "updatedAt">
): Promise<Transaction> {
  const collection = await getCollection("transactions");
  const now = new Date().toISOString();

  const doc: Transaction = {
    ...tx,
    txHash: null,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

/**
 * Update transaction status and txHash.
 */
export async function updateTransactionStatus(
  txId: ObjectId,
  status: TxStatus,
  txHash?: string,
  error?: string
): Promise<void> {
  const collection = await getCollection("transactions");
  await collection.updateOne(
    { _id: txId },
    {
      $set: {
        status,
        txHash: txHash || null,
        error: error || null,
        updatedAt: new Date().toISOString(),
      },
    }
  );
}

/**
 * Get transaction status for frontend polling.
 */
export async function getTransactionStatus(txId: string) {
  const collection = await getCollection("transactions");
  const tx = await collection.findOne({ _id: new ObjectId(txId) });
  if (!tx) return null;

  return {
    id: tx._id.toString(),
    status: tx.status,
    txHash: tx.txHash,
    type: tx.type,
    tokenId: tx.tokenId,
    rarity: tx.rarity,
    error: tx.error,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
  };
}

/**
 * Check on-chain receipt and update transaction status.
 * For mint transactions, extract tokenId from CardMinted event.
 */
export async function confirmTransaction(txId: string): Promise<TxStatus> {
  const collection = await getCollection("transactions");
  const tx = await collection.findOne({ _id: new ObjectId(txId) });

  if (!tx || !tx.txHash) return "failed";
  if (tx.status !== "pending") return tx.status;

  try {
    const provider = getProvider();
    const receipt = await provider.getTransactionReceipt(tx.txHash);

    if (!receipt) {
      return "pending"; // Belum ada receipt, masih pending
    }

    const newStatus: TxStatus = receipt.status === 1 ? "confirmed" : "failed";

    // Jika confirmed dan type mint, extract tokenId dari CardMinted event
    if (newStatus === "confirmed" && tx.type === "mint" && receipt.logs) {
      for (const log of receipt.logs) {
        if (
          log.topics[0] === CARD_MINTED_TOPIC &&
          log.address.toLowerCase() === process.env.CONTRACT_ADDRESS?.toLowerCase()
        ) {
          // topics[1] = tokenId (indexed)
          const tokenId = parseInt(log.topics[1], 16);

          // Update cards collection — match by txId
          const cardsCollection = await collection.db.collection("cards");
          await cardsCollection.updateOne(
            { txId: tx._id.toString() },
            {
              $set: {
                tokenId,
                status: "Digital",
                updatedAt: new Date().toISOString(),
              },
            }
          );
          break;
        }
      }
    }

    await collection.updateOne(
      { _id: tx._id },
      {
        $set: {
          status: newStatus,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    return newStatus;
  } catch (error) {
    console.error("Confirm transaction error:", error);
    return "pending"; // Network error, jangan mark as failed
  }
}
