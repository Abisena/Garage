'use client';

// Temporary file - untuk review lengkap implementasi

/**
 * CHANGES REQUIRED:
 * 
 * 1. Work Order Info - Horizontal Card di atas grid
 * 2. Kolom Discount di grid dengan:
 *    - Input discount
 *    - Toggle button (% atau Rp)
 *    - Auto-calculate setelah discount
 * 
 * 3. Calculation dengan discount:
 *    - Calculate discount amount per part
 *    - Update total price per part after discount
 *    - Update DPP, PPN, Total with discounted prices
 * 
 * 4. Helper functions needed:
 *    - calculatePartTotal(qty, price, discount, discountType)
 *    - calculateTotalDiscount()
 *    - updatePartDiscount(partId, discount, type)
 */

// Updated calculation functions:
const calculatePartTotal = (quantity: number, unitPrice: number, discount: number, discountType: 'percent' | 'amount') => {
  const subtotal = quantity * unitPrice;
  if (discountType === 'percent') {
    return subtotal - (subtotal * discount / 100);
  } else {
    return subtotal - discount;
  }
};

const calculateTotalDiscount = (spareParts: SparePart[]) => {
  return spareParts.reduce((sum, part) => {
    const subtotal = part.quantity * part.unitPrice;
    const finalPrice = part.totalPrice;
    return sum + (subtotal - finalPrice);
  }, 0);
};

// Update handleAddPart untuk calculate dengan discount:
const handleAddPart = () => {
  if (newPart.name && newPart.partNumber && newPart.quantity > 0 && newPart.unitPrice > 0) {
    const subtotal = newPart.quantity * newPart.unitPrice;
    const finalPrice = calculatePartTotal(newPart.quantity, newPart.unitPrice, newPart.discount, newPart.discountType);
    
    const part: SparePart = {
      id: `PART-${Date.now()}`,
      name: newPart.name,
      partNumber: newPart.partNumber,
      quantity: newPart.quantity,
      unitPrice: newPart.unitPrice,
      discount: newPart.discount,
      discountType: newPart.discountType,
      totalPrice: finalPrice
    };
    
    setSpareParts([...spareParts, part]);
    setNewPart({ name: '', partNumber: '', quantity: 1, unitPrice: 0, discount: 0, discountType: 'percent' });
    setShowSuggestions(false);
  }
};

/**
 * GRID STRUCTURE dengan Discount:
 * 
 * Columns:
 * 1. # (index)
 * 2. Part Name
 * 3. Part Number  
 * 4. Qty
 * 5. Unit Price
 * 6. Discount (input + toggle %)
 * 7. Total (after discount)
 * 8. Action (delete)
 * 
 * Input Row:
 * - Part Name: text input with autocomplete
 * - Part Number: readonly
 * - Qty: number input
 * - Unit Price: readonly
 * - Discount: number input with % toggle button
 * - Total: calculated display
 * - Action: Add button
 */

export default {};
