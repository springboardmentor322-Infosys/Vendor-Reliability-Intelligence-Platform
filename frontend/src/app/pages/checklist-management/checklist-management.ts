import { Component } from '@angular/core';

interface Checklist {
  id: string;
  name: string;
  category: string;
  vendor: string;
  items: number;
  completed: number;
  status: string;
}

@Component({
  selector: 'app-checklist-management',
  standalone: true,
  imports: [],
  templateUrl: './checklist-management.html',
  styleUrl: './checklist-management.css'
})
export class ChecklistManagement {

  checklists: Checklist[] = [
    {
      id: 'CHK-2026-001',
      name: 'Vendor Compliance Checklist',
      category: 'Compliance',
      vendor: 'National Supplies',
      items: 20,
      completed: 20,
      status: 'Completed'
    },
    {
      id: 'CHK-2026-002',
      name: 'Procurement Process Checklist',
      category: 'Procurement',
      vendor: 'Western Solutions',
      items: 15,
      completed: 11,
      status: 'In Progress'
    },
    {
      id: 'CHK-2026-003',
      name: 'Contract Review Checklist',
      category: 'Contracts',
      vendor: 'Global Components',
      items: 18,
      completed: 18,
      status: 'Completed'
    },
    {
      id: 'CHK-2026-004',
      name: 'Quality Inspection Checklist',
      category: 'Quality',
      vendor: 'Apex Logistics',
      items: 25,
      completed: 16,
      status: 'In Progress'
    }
  ];

  get totalChecklists(): number {
    return this.checklists.length;
  }

  get completedChecklists(): number {
    return this.checklists.filter(
      c => c.status === 'Completed'
    ).length;
  }

  get inProgressChecklists(): number {
    return this.checklists.filter(
      c => c.status === 'In Progress'
    ).length;
  }

  get totalItems(): number {
    return this.checklists.reduce(
      (sum, checklist) => sum + checklist.items,
      0
    );
  }

  refresh(): void {
    console.log('Checklist management refreshed');
  }

  getProgress(checklist: Checklist): number {
    if (checklist.items === 0) return 0;

    return Math.round(
      (checklist.completed / checklist.items) * 100
    );
  }
}