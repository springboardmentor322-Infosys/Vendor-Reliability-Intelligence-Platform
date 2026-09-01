import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-demand-planning',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './demand-planning.html',
  styleUrl: './demand-planning.css'
})
export class DemandPlanning {

  demandData = [
    {
      product: 'Industrial Equipment',
      currentDemand: 420,
      forecast: 480,
      change: 14.3,
      status: 'Increasing'
    },
    {
      product: 'Safety Components',
      currentDemand: 280,
      forecast: 310,
      change: 10.7,
      status: 'Increasing'
    },
    {
      product: 'Electronic Components',
      currentDemand: 520,
      forecast: 495,
      change: -4.8,
      status: 'Stable'
    },
    {
      product: 'Packaging Materials',
      currentDemand: 190,
      forecast: 225,
      change: 18.4,
      status: 'Increasing'
    },
    {
      product: 'Raw Materials',
      currentDemand: 360,
      forecast: 340,
      change: -5.6,
      status: 'Stable'
    }
  ];

  get totalCurrentDemand(): number {
    return this.demandData.reduce(
      (total, item) => total + item.currentDemand,
      0
    );
  }

  get totalForecast(): number {
    return this.demandData.reduce(
      (total, item) => total + item.forecast,
      0
    );
  }

  get increasingProducts(): number {
    return this.demandData.filter(
      item => item.status === 'Increasing'
    ).length;
  }

  get averageChange(): number {
    return this.demandData.reduce(
      (total, item) => total + item.change,
      0
    ) / this.demandData.length;
  }
}