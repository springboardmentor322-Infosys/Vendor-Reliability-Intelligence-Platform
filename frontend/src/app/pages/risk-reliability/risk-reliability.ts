import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface RiskSupplier {
  name: string;
  category: string;
  riskScore: number;
  reliability: number;
  deliveryRisk: string;
  qualityRisk: string;
  status: string;
}

@Component({
  selector: 'app-risk-reliability',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './risk-reliability.html',
  styleUrl: './risk-reliability.css'
})
export class RiskReliability {

  suppliers: RiskSupplier[] = [
    {
      name: 'Metro Supplies',
      category: 'Office Supplies',
      riskScore: 78,
      reliability: 76,
      deliveryRisk: 'High',
      qualityRisk: 'Medium',
      status: 'High Risk'
    },
    {
      name: 'Reliable Logistics',
      category: 'Logistics',
      riskScore: 56,
      reliability: 84,
      deliveryRisk: 'Medium',
      qualityRisk: 'Low',
      status: 'Medium Risk'
    },
    {
      name: 'Prime Components',
      category: 'Components',
      riskScore: 43,
      reliability: 88,
      deliveryRisk: 'Low',
      qualityRisk: 'Medium',
      status: 'Medium Risk'
    },
    {
      name: 'Global Industrial Ltd.',
      category: 'Industrial',
      riskScore: 29,
      reliability: 90,
      deliveryRisk: 'Low',
      qualityRisk: 'Low',
      status: 'Low Risk'
    },
    {
      name: 'TechSource Solutions',
      category: 'IT Equipment',
      riskScore: 15,
      reliability: 95,
      deliveryRisk: 'Low',
      qualityRisk: 'Low',
      status: 'Low Risk'
    }
  ];

  get highRiskCount(): number {
    return this.suppliers.filter(s => s.status === 'High Risk').length;
  }

  get mediumRiskCount(): number {
    return this.suppliers.filter(s => s.status === 'Medium Risk').length;
  }

  get lowRiskCount(): number {
    return this.suppliers.filter(s => s.status === 'Low Risk').length;
  }

  get averageRisk(): number {
    return Math.round(
      this.suppliers.reduce((sum, s) => sum + s.riskScore, 0) /
      this.suppliers.length
    );
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'High Risk':
        return 'high';

      case 'Medium Risk':
        return 'medium';

      case 'Low Risk':
        return 'low';

      default:
        return '';
    }
  }

  getRiskClass(score: number): string {
    if (score >= 70) {
      return 'high-risk';
    }

    if (score >= 40) {
      return 'medium-risk';
    }

    return 'low-risk';
  }

  getRiskWidth(score: number): number {
    return score;
  }
}