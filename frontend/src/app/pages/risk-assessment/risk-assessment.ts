import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface RiskItem {
  vendor: string;
  score: number;
  riskLevel: string;
  financialRisk: string;
  deliveryRisk: string;
  qualityRisk: string;
  complianceRisk: string;
  recommendation: string;
}

@Component({
  selector: 'app-risk-assessment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './risk-assessment.html',
  styleUrl: './risk-assessment.css'
})
export class RiskAssessment {

  riskItems: RiskItem[] = [
    {
      vendor: 'United Systems',
      score: 64.55,
      riskLevel: 'Medium Risk',
      financialRisk: 'Low',
      deliveryRisk: 'Medium',
      qualityRisk: 'Medium',
      complianceRisk: 'Low',
      recommendation: 'Continue monitoring vendor performance.'
    },
    {
      vendor: 'Global Components',
      score: 64.33,
      riskLevel: 'Medium Risk',
      financialRisk: 'Low',
      deliveryRisk: 'Medium',
      qualityRisk: 'Medium',
      complianceRisk: 'Low',
      recommendation: 'Monitor delivery and quality performance.'
    },
    {
      vendor: 'Reliable Technologies',
      score: 64.33,
      riskLevel: 'Medium Risk',
      financialRisk: 'Low',
      deliveryRisk: 'Medium',
      qualityRisk: 'Medium',
      complianceRisk: 'Low',
      recommendation: 'Review vendor performance regularly.'
    },
    {
      vendor: 'Apex Logistics',
      score: 63.98,
      riskLevel: 'Medium Risk',
      financialRisk: 'Low',
      deliveryRisk: 'Medium',
      qualityRisk: 'Medium',
      complianceRisk: 'Low',
      recommendation: 'Consider a backup supplier for critical procurement.'
    },
    {
      vendor: 'Western Solutions',
      score: 63.73,
      riskLevel: 'Medium Risk',
      financialRisk: 'Low',
      deliveryRisk: 'Medium',
      qualityRisk: 'Medium',
      complianceRisk: 'Low',
      recommendation: 'Continue using the vendor with closer monitoring.'
    }
  ];

  getRiskClass(risk: string): string {
    switch (risk.toLowerCase()) {
      case 'high':
        return 'high';

      case 'medium':
        return 'medium';

      case 'low':
        return 'low';

      default:
        return '';
    }
  }

  getRiskCount(level: string): number {
    return this.riskItems.filter(
      item => item.riskLevel.toLowerCase().includes(level.toLowerCase())
    ).length;
  }

  getAverageScore(): number {
    if (this.riskItems.length === 0) {
      return 0;
    }

    const total = this.riskItems.reduce(
      (sum, item) => sum + item.score,
      0
    );

    return total / this.riskItems.length;
  }
}