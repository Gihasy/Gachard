"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CardItem from "@/components/CardItem";

export default function Koleksi() {
  const router = useRouter();
  const [cards, setCards] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(stored);
    setUserId(user.user_id);
    fetch(`/api/cards?userId=${user.user_id}`)
      .then((r) => r.json())
      .then((d) => {
        setCards(d.cards || []);
        setLoading(false);
      });
  }, [router]);

  if (loading) return <p className="text-center mt-20" style={{ color: "var(--silver-mist)" }}>Loading...</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 uppercase" style={{ color: "var(--text-primary)" }}>
        Koleksi Saya
      </h1>
      {cards.length === 0 ? (
        <p style={{ color: "var(--silver-mist)" }}>Belum ada kartu. Beli pack di Home!</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((card) => (
            <CardItem
              key={card.templateId + (card.tokenId || "")}
              tokenId={card.tokenId}
              templateId={card.templateId}
              rarity={card.rarity}
              artworkUrl={card.artworkUrl || ""}
              status={card.status || "Digital"}
              userId={userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
