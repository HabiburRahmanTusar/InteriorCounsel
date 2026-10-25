/**
 * Unit tests for Interior Company Commercial & Financial Business Logic
 */
describe('Interior Company Business Logic Tests', () => {
  describe('Bill & Estimate Calculations', () => {
    it('should correctly calculate subtotal, percentage discount, and total amount', () => {
      const items = [
        { description: 'Master Bed Wall Paneling (HDF + Veneer)', unit: 'sft', quantity: 120, unitPrice: 850, amount: 102000 },
        { description: 'Concealed LED Strip Lighting', unit: 'rft', quantity: 50, unitPrice: 320, amount: 16000 },
        { description: 'Modular Wardrobe with Soft-Close Hardware', unit: 'sft', quantity: 80, unitPrice: 1650, amount: 132000 },
      ];

      const subtotal = items.reduce((acc, item) => acc + item.amount, 0); // 250,000
      expect(subtotal).toBe(250000);

      // 5% discount
      const discountPercent = 5;
      const discountAmount = (subtotal * discountPercent) / 100; // 12,500
      expect(discountAmount).toBe(12500);

      const taxableAmount = subtotal - discountAmount; // 237,500
      const vatPercent = 0;
      const vatAmount = (taxableAmount * vatPercent) / 100;
      const totalAmount = taxableAmount + vatAmount;

      expect(totalAmount).toBe(237500);

      // Verify payment tracking
      let totalCashIn = 100000; // Client Advance
      let customerDue = totalAmount - totalCashIn;
      let paymentState = totalCashIn >= totalAmount ? 'paid' : totalCashIn > 0 ? 'partial' : 'not_paid';

      expect(customerDue).toBe(137500);
      expect(paymentState).toBe('partial');

      // Second payment
      totalCashIn += 137500;
      customerDue = totalAmount - totalCashIn;
      paymentState = totalCashIn >= totalAmount ? 'paid' : totalCashIn > 0 ? 'partial' : 'not_paid';

      expect(customerDue).toBe(0);
      expect(paymentState).toBe('paid');
    });

    it('should compute project gross margin from material and direct fitting costs', () => {
      const projectRevenue = 237500;

      // Direct Material Vendor Bills (Wood, Hardware, Glass)
      const materialBills = [
        { category: 'wood_board', amount: 85000 },
        { category: 'hardware', amount: 22000 },
        { category: 'lighting_electric', amount: 9500 },
      ];
      const totalMaterialCost = materialBills.reduce((acc, b) => acc + b.amount, 0); // 116,500

      // Direct Labor & Fitting / Installation Charges
      const directFittingLabor = 35000;
      const directTransport = 4500;
      const totalDirectCosts = totalMaterialCost + directFittingLabor + directTransport; // 156,000

      const projectGrossProfit = projectRevenue - totalDirectCosts; // 81,500
      const grossMarginPercent = Number(((projectGrossProfit / projectRevenue) * 100).toFixed(1));

      expect(projectGrossProfit).toBe(81500);
      expect(grossMarginPercent).toBe(34.3);
    });

    it('should calculate executive Net Profit by subtracting operating overheads from gross profit', () => {
      const totalGrossProfit = 81500;
      const showroomRent = 25000;
      const utilities = 6000;
      const staffSalaries = 30000;
      const entertainmentAndConveyance = 3500;

      const totalOperatingExpenses = showroomRent + utilities + staffSalaries + entertainmentAndConveyance; // 64,500
      const netProfit = totalGrossProfit - totalOperatingExpenses; // 17,000

      expect(netProfit).toBe(17000);
    });
  });
});
