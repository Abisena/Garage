import { SpareParts } from "../components/SpareParts";

export type BranchName = 'Jakarta' | 'Bandung' | 'Surabaya';

/**
 * Initialize stock by branch if not exists
 * Distributes legacy stock across branches randomly
 */
export function initializeStockByBranch(parts: SpareParts[]): SpareParts[] {
  return parts.map(part => {
    // If already has stockByBranch, return as is
    if (part.stockByBranch) {
      return part;
    }

    // Distribute legacy stock across branches
    const totalStock = part.stock;
    const jktStock = Math.floor(totalStock * 0.4); // 40% to Jakarta
    const bdgStock = Math.floor(totalStock * 0.35); // 35% to Bandung
    const sbyStock = totalStock - jktStock - bdgStock; // Rest to Surabaya

    return {
      ...part,
      stockByBranch: {
        Jakarta: jktStock,
        Bandung: bdgStock,
        Surabaya: sbyStock
      }
    };
  });
}

/**
 * Get stock for a specific branch
 */
export function getBranchStock(part: MasterSparePart, branch: BranchName): number {
  if (!part.stockByBranch) {
    return 0;
  }
  return part.stockByBranch[branch] || 0;
}

/**
 * Update stock for a specific branch
 */
export function updateBranchStock(
  parts: MasterSparePart[],
  partNumber: string,
  branch: BranchName,
  quantity: number
): MasterSparePart[] {
  return parts.map(part => {
    if (part.partNumber === partNumber) {
      const currentStock = part.stockByBranch?.[branch] || 0;
      const newStock = currentStock + quantity; // Can be negative for reduction

      // Don't allow negative stock
      if (newStock < 0) {
        console.warn(`Cannot reduce stock below 0 for ${partNumber} at ${branch}`);
        return part;
      }

      return {
        ...part,
        stockByBranch: {
          ...part.stockByBranch!,
          [branch]: newStock
        },
        // Update total stock
        stock: part.stock + quantity
      };
    }
    return part;
  });
}

/**
 * Process transfer stock movement
 * Reduces stock from sender branch and adds to requester branch
 */
export function processTransferStock(
  parts: MasterSparePart[],
  items: Array<{ partNumber: string; quantity: number }>,
  fromBranch: BranchName,
  toBranch: BranchName
): { success: boolean; updatedParts: MasterSparePart[]; errors: string[] } {
  let updatedParts = [...parts];
  const errors: string[] = [];

  console.log('🔄 Processing transfer stock:', { fromBranch, toBranch, itemsCount: items.length });

  // First, validate all items have sufficient stock
  for (const item of items) {
    const part = updatedParts.find(p => p.partNumber === item.partNumber);
    if (!part) {
      errors.push(`Part ${item.partNumber} not found`);
      continue;
    }

    const fromStock = getBranchStock(part, fromBranch);
    console.log(`📦 Stock check for ${item.partNumber}:`, {
      fromBranch,
      currentStock: fromStock,
      requested: item.quantity
    });

    if (fromStock < item.quantity) {
      errors.push(`Insufficient stock for ${part.partName} at ${fromBranch}. Available: ${fromStock}, Requested: ${item.quantity}`);
    }
  }

  // If there are errors, don't process
  if (errors.length > 0) {
    console.error('❌ Transfer validation failed:', errors);
    return { success: false, updatedParts: parts, errors };
  }

  // Process the transfer
  for (const item of items) {
    console.log(`⚙️ Processing ${item.partNumber}: ${fromBranch} (-${item.quantity}) → ${toBranch} (+${item.quantity})`);
    
    // Reduce from sender branch
    updatedParts = updateBranchStock(updatedParts, item.partNumber, fromBranch, -item.quantity);
    // Add to requester branch
    updatedParts = updateBranchStock(updatedParts, item.partNumber, toBranch, item.quantity);
    
    // Log the result
    const updatedPart = updatedParts.find(p => p.partNumber === item.partNumber);
    if (updatedPart) {
      console.log(`✅ Updated ${item.partNumber}:`, {
        [fromBranch]: getBranchStock(updatedPart, fromBranch),
        [toBranch]: getBranchStock(updatedPart, toBranch)
      });
    }
  }

  console.log('✅ Transfer completed successfully');
  return { success: true, updatedParts, errors: [] };
}

/**
 * Get total stock across all branches
 */
export function getTotalStock(part: MasterSparePart): number {
  if (!part.stockByBranch) {
    return part.stock;
  }
  return part.stockByBranch.Jakarta + part.stockByBranch.Bandung + part.stockByBranch.Surabaya;
}

/**
 * Load and initialize master spare parts with branch stock
 */
export function loadMasterSpareParts(): MasterSparePart[] {
  const saved = localStorage.getItem('masterSpareParts');
  if (!saved) {
    return [];
  }

  const parts: MasterSparePart[] = JSON.parse(saved);
  const initialized = initializeStockByBranch(parts);
  
  // Save back if we initialized
  if (JSON.stringify(parts) !== JSON.stringify(initialized)) {
    localStorage.setItem('masterSpareParts', JSON.stringify(initialized));
  }

  return initialized;
}

/**
 * Save master spare parts to localStorage
 */
export function saveMasterSpareParts(parts: MasterSparePart[]): void {
  localStorage.setItem('masterSpareParts', JSON.stringify(parts));
}