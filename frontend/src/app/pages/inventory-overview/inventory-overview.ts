import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inventory-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory-overview.html',
  styleUrl: './inventory-overview.css'
})
export class InventoryOverview {

  inventoryItems = [
    {
      product: 'Industrial Equipment',
      category: 'Equipment',
      vendor: 'Western Solutions',
      stock: 245,
      reorderLevel: 100,
      status: 'In Stock'
    },
    {
      product: 'Safety Components',
      category: 'Safety',
      vendor: 'Apex Logistics',
      stock: 78,
      reorderLevel: 100,
      status: 'Low Stock'
    },
    {
      product: 'Electronic Components',
      category: 'Electronics',
      vendor: 'Reliable Technologies',
      stock: 420,
      reorderLevel: 150,
      status: 'In Stock'
    },
    {
      product: 'Packaging Materials',
      category: 'Packaging',
      vendor: 'Global Components',
      stock: 52,
      reorderLevel: 75,
      status: 'Low Stock'
    },
    {
      product: 'Raw Materials',
      category: 'Materials',
      vendor: 'Western Logistics',
      stock: 315,
      reorderLevel: 120,
      status: 'In Stock'
    }
  ];

  get totalItems(): number {
    return this.inventoryItems.length;
  }

  get lowStockItems(): number {
    return this.inventoryItems.filter(
      item => item.status === 'Low Stock'
    ).length;
  }

  get inStockItems(): number {
    return this.inventoryItems.filter(
      item => item.status === 'In Stock'
    ).length;
  }

  get totalStock(): number {
    return this.inventoryItems.reduce(
      (total, item) => total + item.stock,
      0
    );
  }
}