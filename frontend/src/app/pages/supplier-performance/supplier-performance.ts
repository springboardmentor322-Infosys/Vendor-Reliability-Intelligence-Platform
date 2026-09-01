import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Supplier {
  name: string;
  category: string;
  delivery: number;
  quality: number;
  reliability: number;
  orders: number;
  status: string;
}

@Component({
  selector: 'app-supplier-performance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supplier-performance.html',
  styleUrl: './supplier-performance.css'
})
export class SupplierPerformance {

  suppliers: Supplier[] = [
    {
      name: 'TechSource Solutions',
      category: 'IT Equipment',
      delivery: 96,
      quality: 94,
      reliability: 95,
      orders: 42,
      status: 'Excellent'
    },
    {
      name: 'Global Industrial Ltd.',
      category: 'Industrial',
      delivery: 91,
      quality: 89,
      reliability: 90,
      orders: 35,
      status: 'Good'
    },
    {
      name: 'Prime Components',
      category: 'Components',
      delivery: 87,
      quality: 92,
      reliability: 88,
      orders: 31,
      status: 'Good'
    },
    {
      name: 'Reliable Logistics',
      category: 'Logistics',
      delivery: 82,
      quality: 86,
      reliability: 84,
      orders: 27,
      status: 'Average'
    },
    {
      name: 'Metro Supplies',
      category: 'Office Supplies',
      delivery: 74,
      quality: 79,
      reliability: 76,
      orders: 21,
      status: 'Needs Attention'
    }
  ];

  get averageDelivery(): number {
    return Math.round(
      this.suppliers.reduce((sum, s) => sum + s.delivery, 0) /
      this.suppliers.length
    );
  }

  get averageQuality(): number {
    return Math.round(
      this.suppliers.reduce((sum, s) => sum + s.quality, 0) /
      this.suppliers.length
    );
  }

  get averageReliability(): number {
    return Math.round(
      this.suppliers.reduce((sum, s) => sum + s.reliability, 0) /
      this.suppliers.length
    );
  }

  get excellentSuppliers(): number {
    return this.suppliers.filter(s => s.status === 'Excellent').length;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Excellent':
        return 'excellent';

      case 'Good':
        return 'good';

      case 'Average':
        return 'average';

      case 'Needs Attention':
        return 'attention';

      default:
        return '';
    }
  }
}