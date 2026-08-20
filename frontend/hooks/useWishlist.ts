"use client";
import { useState, useEffect, useCallback } from "react";
import { getWishlist, toggleWishlist as toggle } from "@/lib/wishlist";

export function useWishlist() {
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    setWishlist(getWishlist());
  }, []);

  const toggleWishlist = useCallback((cardId: string) => {
    const updated = toggle(cardId);
    setWishlist([...updated]);
  }, []);

  const isWishlisted = useCallback((cardId: string) => {
    return wishlist.includes(cardId);
  }, [wishlist]);

  return { wishlist, toggleWishlist, isWishlisted, count: wishlist.length };
}
