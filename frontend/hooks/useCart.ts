"use client";
import { useState, useEffect, useCallback } from "react";
import { getCart, addToCart as add, removeFromCart as remove, clearCart as clear } from "@/lib/cart";

export function useCart() {
  const [cart, setCart] = useState<string[]>([]);

  useEffect(() => {
    setCart(getCart());
  }, []);

  const addToCart = useCallback((listingId: string) => {
    const updated = add(listingId);
    setCart([...updated]);
  }, []);

  const removeFromCart = useCallback((listingId: string) => {
    const updated = remove(listingId);
    setCart([...updated]);
  }, []);

  const clearCart = useCallback(() => {
    clear();
    setCart([]);
  }, []);

  const isInCartFn = useCallback((listingId: string) => {
    return cart.includes(listingId);
  }, [cart]);

  return { cart, addToCart, removeFromCart, clearCart, isInCart: isInCartFn, count: cart.length };
}
