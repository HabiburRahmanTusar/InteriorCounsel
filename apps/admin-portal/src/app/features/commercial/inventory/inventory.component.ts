import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommercialService } from '../../../core/services/commercial.service';

@Component({
  selector: 'wfm-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.component.html',
})
export class InventoryComponent implements OnInit {
  private commercialService = inject(CommercialService);

  readonly products = signal<any[]>([]);
  readonly loading = signal(false);
  readonly showModal = signal(false);
  readonly isEditing = signal(false);
  readonly currentId = signal<string | null>(null);

  searchQuery = '';
  selectedCategory = 'All';
  selectedType = '';

  readonly categories = [
    'All',
    'Gypsum & Ceiling',
    'Board & Plywood',
    'Paint & Polish',
    'Glass & Mirror',
    'Hardware & Fittings',
    'Electrical & Wiring',
    'Lighting Fixtures',
    'Fabrication & Metal',
    'Labor & Services',
    'General',
  ];

  formProduct: any = {
    name: '',
    productType: 'Storable Product',
    invoicingPolicy: 'Ordered quantities',
    category: 'General',
    salesPrice: 0,
    cost: 0,
    unit: 'sft',
    stockQuantity: 0,
    minStockAlert: 5,
    internalRef: '',
    barcode: '',
    canBeSold: true,
    canBePurchased: true,
    notes: '',
  };

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.loading.set(true);
    const params: any = {};
    if (this.searchQuery) params.search = this.searchQuery;
    if (this.selectedCategory && this.selectedCategory !== 'All') params.category = this.selectedCategory;
    if (this.selectedType) params.productType = this.selectedType;

    this.commercialService.getProducts(params).subscribe({
      next: (res) => {
        this.products.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  readonly filteredProducts = computed(() => {
    let list = this.products();
    if (this.selectedCategory && this.selectedCategory !== 'All') {
      list = list.filter((p) => p.category === this.selectedCategory);
    }
    if (this.selectedType) {
      list = list.filter((p) => p.productType === this.selectedType);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.internalRef?.toLowerCase().includes(q)
      );
    }
    return list;
  });

  readonly totalProducts = computed(() => this.products().length);
  readonly lowStockCount = computed(() =>
    this.products().filter(
      (p) => p.productType === 'Storable Product' && (p.stockQuantity || 0) <= (p.minStockAlert || 5)
    ).length
  );
  readonly totalStockValue = computed(() =>
    this.products().reduce(
      (acc, p) => acc + (p.cost || p.salesPrice || 0) * (p.stockQuantity || 0),
      0
    )
  );

  openNewModal() {
    this.isEditing.set(false);
    this.currentId.set(null);
    this.formProduct = {
      name: '',
      productType: 'Storable Product',
      invoicingPolicy: 'Ordered quantities',
      category: 'General',
      salesPrice: 0,
      cost: 0,
      unit: 'sft',
      stockQuantity: 0,
      minStockAlert: 5,
      internalRef: `PRD-${Date.now().toString().slice(-4)}`,
      barcode: '',
      canBeSold: true,
      canBePurchased: true,
      notes: '',
    };
    this.showModal.set(true);
  }

  editProduct(p: any) {
    this.isEditing.set(true);
    this.currentId.set(p._id);
    this.formProduct = { ...p };
    this.showModal.set(true);
  }

  saveProduct() {
    if (!this.formProduct.name) {
      alert('Product Name is required');
      return;
    }

    if (this.isEditing() && this.currentId()) {
      this.commercialService.updateProduct(this.currentId()!, this.formProduct).subscribe({
        next: () => {
          this.showModal.set(false);
          this.loadProducts();
        },
        error: (err) => alert(err?.error?.message || 'Failed to update product'),
      });
    } else {
      this.commercialService.createProduct(this.formProduct).subscribe({
        next: () => {
          this.showModal.set(false);
          this.loadProducts();
        },
        error: (err) => alert(err?.error?.message || 'Failed to create product'),
      });
    }
  }

  deleteProduct(id: string) {
    if (confirm('Are you sure you want to delete this product?')) {
      this.commercialService.deleteProduct(id).subscribe({
        next: () => this.loadProducts(),
        error: (err) => alert(err?.error?.message || 'Failed to delete product'),
      });
    }
  }
}
