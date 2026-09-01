import { Component } from '@angular/core';

interface Control {
  id: string;
  control: string;
  category: string;
  vendor: string;
  auditor: string;
  score: number;
  status: string;
}

@Component({
  selector: 'app-control-assessment',
  standalone: true,
  imports: [],
  templateUrl: './control-assessment.html',
  styleUrl: './control-assessment.css'
})
export class ControlAssessment {

  controls: Control[] = [
    {
      id: 'CTL-2026-001',
      control: 'Vendor Compliance',
      category: 'Compliance',
      vendor: 'National Supplies',
      auditor: 'Sai Subham',
      score: 92,
      status: 'Passed'
    },
    {
      id: 'CTL-2026-002',
      control: 'Purchase Order Approval',
      category: 'Procurement',
      vendor: 'Western Solutions',
      auditor: 'Auditor',
      score: 85,
      status: 'Passed'
    },
    {
      id: 'CTL-2026-003',
      control: 'Contract Compliance',
      category: 'Contracts',
      vendor: 'Global Components',
      auditor: 'Auditor',
      score: 74,
      status: 'Needs Review'
    },
    {
      id: 'CTL-2026-004',
      control: 'Delivery Performance',
      category: 'Supply Chain',
      vendor: 'Reliable Supplies',
      auditor: 'Sai Subham',
      score: 89,
      status: 'Passed'
    },
    {
      id: 'CTL-2026-005',
      control: 'Quality Management',
      category: 'Quality',
      vendor: 'Apex Logistics',
      auditor: 'Auditor',
      score: 68,
      status: 'Needs Review'
    }
  ];

  get totalControls(): number {
    return this.controls.length;
  }

  get passedControls(): number {
    return this.controls.filter(c => c.status === 'Passed').length;
  }

  get reviewControls(): number {
    return this.controls.filter(c => c.status === 'Needs Review').length;
  }

  get averageScore(): number {
    if (!this.controls.length) return 0;

    const total = this.controls.reduce(
      (sum, control) => sum + control.score,
      0
    );

    return Math.round(total / this.controls.length);
  }

  refresh(): void {
    console.log('Control assessment refreshed');
  }
}