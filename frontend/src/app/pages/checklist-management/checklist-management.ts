import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

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
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './checklist-management.html',
  styleUrl: './checklist-management.css'
})
export class ChecklistManagement implements OnInit {

  private readonly storageKey = 'vendoriq_checklists';

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

  searchTerm: string = '';
  selectedCategory: string = 'All Categories';
  selectedStatus: string = 'All Status';

  showCreateForm: boolean = false;
  showViewModal: boolean = false;

  selectedChecklist: Checklist | null = null;

  newChecklist = {
    name: '',
    category: 'Compliance',
    vendor: '',
    items: 1,
    completed: 0
  };

  ngOnInit(): void {
    this.loadChecklists();
  }

  /**
   * Load checklist data from browser storage.
   * If no saved data exists, the default checklist data is used.
   */
  loadChecklists(): void {
    const savedData = localStorage.getItem(this.storageKey);

    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);

        if (Array.isArray(parsedData)) {
          this.checklists = parsedData;
          return;
        }
      } catch (error) {
        console.error('Unable to load saved checklists:', error);
      }
    }

    this.saveChecklists();
  }

  /**
   * Save checklist data to browser storage.
   */
  private saveChecklists(): void {
    localStorage.setItem(
      this.storageKey,
      JSON.stringify(this.checklists)
    );
  }

  /**
   * Filter checklists according to search,
   * category and status selections.
   */
  get filteredChecklists(): Checklist[] {

    const search = this.searchTerm
      .trim()
      .toLowerCase();

    return this.checklists.filter(checklist => {

      const matchesSearch =
        !search ||
        checklist.id.toLowerCase().includes(search) ||
        checklist.name.toLowerCase().includes(search) ||
        checklist.vendor.toLowerCase().includes(search);

      const matchesCategory =
        this.selectedCategory === 'All Categories' ||
        checklist.category === this.selectedCategory;

      const matchesStatus =
        this.selectedStatus === 'All Status' ||
        checklist.status === this.selectedStatus;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus
      );
    });
  }

  /**
   * Summary: total number of checklists.
   */
  get totalChecklists(): number {
    return this.checklists.length;
  }

  /**
   * Summary: completed checklists.
   */
  get completedChecklists(): number {
    return this.checklists.filter(
      checklist => checklist.status === 'Completed'
    ).length;
  }

  /**
   * Summary: in-progress checklists.
   */
  get inProgressChecklists(): number {
    return this.checklists.filter(
      checklist => checklist.status === 'In Progress'
    ).length;
  }

  /**
   * Summary: total checklist items.
   */
  get totalItems(): number {
    return this.checklists.reduce(
      (sum, checklist) => sum + checklist.items,
      0
    );
  }

  /**
   * Refresh the checklist page.
   */
  refresh(): void {

    this.loadChecklists();

    this.searchTerm = '';
    this.selectedCategory = 'All Categories';
    this.selectedStatus = 'All Status';

  }

  /**
   * Open Create Checklist form.
   */
  openCreateForm(): void {

    this.resetNewChecklist();

    this.showCreateForm = true;
  }

  /**
   * Close Create Checklist form.
   */
  closeCreateForm(): void {

    this.showCreateForm = false;
  }

  /**
   * Reset the create form.
   */
  resetNewChecklist(): void {

    this.newChecklist = {
      name: '',
      category: 'Compliance',
      vendor: '',
      items: 1,
      completed: 0
    };

  }

  /**
   * Create a new checklist.
   */
  createChecklist(): void {

    const name = this.newChecklist.name.trim();
    const vendor = this.newChecklist.vendor.trim();

    const items = Number(this.newChecklist.items);
    const completed = Number(this.newChecklist.completed);

    if (!name) {
      alert('Please enter a checklist name.');
      return;
    }

    if (!vendor) {
      alert('Please enter a vendor name.');
      return;
    }

    if (!Number.isFinite(items) || items < 1) {
      alert('Total items must be at least 1.');
      return;
    }

    if (
      !Number.isFinite(completed) ||
      completed < 0 ||
      completed > items
    ) {
      alert(
        'Completed items must be between 0 and the total number of items.'
      );
      return;
    }

    const newChecklist: Checklist = {
      id: this.getNextChecklistId(),
      name: name,
      category: this.newChecklist.category,
      vendor: vendor,
      items: items,
      completed: completed,
      status: completed >= items
        ? 'Completed'
        : 'In Progress'
    };

    this.checklists = [
      newChecklist,
      ...this.checklists
    ];

    this.saveChecklists();

    this.showCreateForm = false;

    this.resetNewChecklist();

  }

  /**
   * Generate the next checklist ID.
   */
  private getNextChecklistId(): string {

    const year = new Date().getFullYear();

    let highestNumber = 0;

    this.checklists.forEach(checklist => {

      const match = checklist.id.match(
        /CHK-\d{4}-(\d+)/
      );

      if (match) {

        const number = Number(match[1]);

        if (number > highestNumber) {
          highestNumber = number;
        }

      }

    });

    const nextNumber = highestNumber + 1;

    return `CHK-${year}-${String(nextNumber).padStart(3, '0')}`;
  }

  /**
   * Open checklist details.
   */
  viewChecklist(checklist: Checklist): void {

    this.selectedChecklist = checklist;

    this.showViewModal = true;
  }

  /**
   * Close checklist details.
   */
  closeViewModal(): void {

    this.showViewModal = false;

    this.selectedChecklist = null;
  }

  /**
   * Calculate checklist progress percentage.
   */
  getProgress(checklist: Checklist): number {

    if (checklist.items === 0) {
      return 0;
    }

    return Math.round(
      (checklist.completed / checklist.items) * 100
    );
  }

}