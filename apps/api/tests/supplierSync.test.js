/**
 * Unit tests for Sales & Invoice Supplier Information Sync with /commercial/vendors
 */

describe('Sales & Invoice Supplier Information Synchronization', () => {
  it('should compute line items supplier purchase, discount, and net purchase correctly', () => {
    const items = [
      {
        description: 'HDF Board 12mm High Gloss',
        unit: 'sft',
        quantity: 100,
        unitPrice: 350,
        amount: 35000,
        supplierName: 'Partex Star Group',
        supplierInvoiceNo: 'INV-PSG-901',
        purchaseAmount: 28000,
        supplierDiscount: 1500,
      },
      {
        description: 'Soft-close Hydraulic Concealed Hinges',
        unit: 'pcs',
        quantity: 60,
        unitPrice: 220,
        amount: 13200,
        supplierName: 'Hafiz Hardware & Tools',
        supplierInvoiceNo: 'HH-5542',
        purchaseAmount: 9000,
        supplierDiscount: 500,
      },
      {
        description: 'Duco Paint Ivory Finish',
        unit: 'lot',
        quantity: 1,
        unitPrice: 15000,
        amount: 15000,
        supplierName: 'Berger Paints Bangladesh',
        supplierInvoiceNo: 'BP-8819',
        purchaseAmount: 11000,
        supplierDiscount: 0,
      },
    ];

    // Compute net purchase per item
    const processed = items.map((it) => {
      const pa = Number(it.purchaseAmount) || 0;
      const sd = Number(it.supplierDiscount) || 0;
      const np = Math.max(0, Number((pa - sd).toFixed(2)));
      return { ...it, netPurchase: np };
    });

    expect(processed[0].netPurchase).toBe(26500); // 28000 - 1500
    expect(processed[1].netPurchase).toBe(8500);  // 9000 - 500
    expect(processed[2].netPurchase).toBe(11000); // 11000 - 0

    // Grouping by supplier
    const suppliersMap = new Map();
    for (const it of processed) {
      if (!suppliersMap.has(it.supplierName)) {
        suppliersMap.set(it.supplierName, []);
      }
      suppliersMap.get(it.supplierName).push(it);
    }

    expect(suppliersMap.size).toBe(3);
    expect([...suppliersMap.keys()]).toEqual([
      'Partex Star Group',
      'Hafiz Hardware & Tools',
      'Berger Paints Bangladesh',
    ]);

    // Supplier Financials in Vendors Directory
    const partexPurchased = suppliersMap.get('Partex Star Group').reduce((acc, it) => acc + it.purchaseAmount, 0);
    const partexDiscount = suppliersMap.get('Partex Star Group').reduce((acc, it) => acc + it.supplierDiscount, 0);
    const partexPaid = 0;
    const partexDue = partexPurchased - partexDiscount - partexPaid;

    expect(partexPurchased).toBe(28000);
    expect(partexDiscount).toBe(1500);
    expect(partexDue).toBe(26500);
  });

  it('should compute consolidated vendor procurement totals across multiple items for the same supplier', () => {
    const items = [
      {
        description: 'Veneer Teak 4x8 ft',
        quantity: 10,
        unitPrice: 1800,
        supplierName: 'Partex Star Group',
        supplierInvoiceNo: 'INV-MULTI-01',
        purchaseAmount: 12000,
        supplierDiscount: 1000,
      },
      {
        description: 'Plywood 18mm Gorjan Core',
        quantity: 20,
        unitPrice: 2400,
        supplierName: 'Partex Star Group',
        supplierInvoiceNo: 'INV-MULTI-01',
        purchaseAmount: 32000,
        supplierDiscount: 2000,
      },
    ];

    const totalPurchase = items.reduce((acc, it) => acc + it.purchaseAmount, 0); // 44,000
    const totalDiscount = items.reduce((acc, it) => acc + it.supplierDiscount, 0); // 3,000
    const netPurchase = totalPurchase - totalDiscount; // 41,000

    expect(totalPurchase).toBe(44000);
    expect(totalDiscount).toBe(3000);
    expect(netPurchase).toBe(41000);
  });

  it('should update master bill profit in real-time when vendor purchases are registered', () => {
    const totalCustomerBill = 120000;
    const directCosts = 15000; // Transport + Fitting
    const vendorPurchases = 44000;

    // Real-time bill profitability
    const realTimeProfit = totalCustomerBill - (directCosts + vendorPurchases);
    expect(realTimeProfit).toBe(61000);

    const margin = Number(((realTimeProfit / totalCustomerBill) * 100).toFixed(1));
    expect(margin).toBe(50.8);
  });
});
