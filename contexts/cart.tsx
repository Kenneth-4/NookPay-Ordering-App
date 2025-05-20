import React, { createContext, useContext, useState } from 'react';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  addOns: Record<string, {
    id: string;
    name: string;
    price: number;
  }>;
  totalPrice: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (newItem: CartItem) => {
    setItems(prev => {
      // Check if the item with same productId and identical add-ons exists
      const existingItemIndex = prev.findIndex(item => {
        const sameProduct = item.productId === newItem.productId;
        const sameAddOns = JSON.stringify(Object.keys(item.addOns).sort()) === 
                            JSON.stringify(Object.keys(newItem.addOns).sort());
        return sameProduct && sameAddOns;
      });

      if (existingItemIndex !== -1) {
        // Update quantity of existing item
        const updatedItems = [...prev];
        const existingItem = updatedItems[existingItemIndex];
        
        // Calculate total add-ons price
        const addOnsPrice = Object.values(newItem.addOns)
          .reduce((total, addOn) => total + addOn.price, 0);
        
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + newItem.quantity,
          totalPrice: (existingItem.quantity + newItem.quantity) * (newItem.price + addOnsPrice)
        };
        return updatedItems;
      }

      // Calculate total add-ons price for new item
      const addOnsPrice = Object.values(newItem.addOns)
        .reduce((total, addOn) => total + addOn.price, 0);
      
      // Add as new item if it doesn't exist
      return [...prev, { 
        ...newItem, 
        id: Math.random().toString(),
        totalPrice: newItem.quantity * (newItem.price + addOnsPrice)
      }];
    });
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          // Calculate total add-ons price
          const addOnsPrice = Object.values(item.addOns)
            .reduce((total, addOn) => total + addOn.price, 0);
          
          return {
            ...item,
            quantity,
            totalPrice: quantity * (item.price + addOnsPrice)
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getCartTotal = () => {
    return items.reduce((total, item) => total + item.totalPrice, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getCartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
