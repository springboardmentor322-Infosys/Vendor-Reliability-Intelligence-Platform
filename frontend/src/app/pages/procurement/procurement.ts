import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Procurement } from '../../services/procurement';
import { Vendor } from '../../services/vendor';
import { Order } from '../../services/order';
import { ToastService } from '../../services/toast';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-procurement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './procurement.html',
  styleUrl: './procurement.css'
})
export class ProcurementPage implements OnInit {
  activeTab: 'requests' | 'orders' = 'requests';

  requests: any[] = [];
  vendors: any[] = [];
  orders: any[] = [];

  selectedStatus = 'All';
  orderStatus = 'All';
  searchText = '';
  orderSearch = '';
  loading = false;
  ordersLoading = false;

  showForm = false;
  editingRequest: any = null;
  showOrderForm = false;
  showOrderDetails = false;
  selectedOrder: any = null;
  orderDetailTab: 'overview' | 'tracking' | 'invoice' = 'overview';

  form = {
    vendor_id: null as number | null,
    product_name: '',
    quantity: 1,
    estimated_amount: 0,
    department: 'General',
    requested_by: '',
    priority: 'Medium',
    justification: '',
    expected_delivery_date: ''
  };

  orderForm = {
    vendor_id: null as number | null,
    expected_delivery_date: '',
    payment_terms: 'Advance',
    shipping_mode: 'Standard',
    status: 'Pending'
  };

  lineItems = [
    { product_name: '', quantity: 1, unit_price: 0 }
  ];

  constructor(
    private procurementService: Procurement,
    private vendorService: Vendor,
    private orderService: Order,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private auth: Auth
  ) {}

  ngOnInit(): void {
    this.loadRequests();
    this.loadVendors();
    this.loadOrders();
  }


  get isVendorManagement(): boolean {
    return this.auth.hasAnyRole(['Vendor Management']);
  }

  setTab(tab: 'requests' | 'orders'): void {
    this.activeTab = tab;
    if (tab === 'orders') this.loadOrders();
  }

  loadRequests(): void {
    this.loading = true;
    this.procurementService.getProcurementRequests().subscribe({
      next: response => {
        this.requests = response || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Failed to load procurement requests:', error);
        this.requests = [];
        this.loading = false;
        this.toastService.show('Failed to load procurement requests.', 'error');
      }
    });
  }

  loadVendors(): void {
    this.vendorService.getVendors().subscribe({
      next: response => {
        this.vendors = (response || []).filter((v: any) => (v.status || 'Active') === 'Active');
        this.cdr.detectChanges();
      },
      error: error => console.error('Failed to load vendors:', error)
    });
  }

  loadOrders(): void {
    this.ordersLoading = true;
    this.orderService.getOrders(this.orderStatus, this.orderSearch, 100, 0).subscribe({
      next: response => {
        this.orders = response || [];
        this.ordersLoading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Failed to load orders:', error);
        this.orders = [];
        this.ordersLoading = false;
        this.toastService.show('Failed to load purchase orders.', 'error');
      }
    });
  }

  openCreateForm(): void {
    this.editingRequest = null;
    this.form = {
      vendor_id: null,
      product_name: '',
      quantity: 1,
      estimated_amount: 0,
      department: 'Facilities',
      requested_by: '',
      priority: 'Medium',
      justification: '',
      expected_delivery_date: ''
    };
    this.showForm = true;
  }

  editRequest(request: any): void {
    this.editingRequest = request;
    this.form = {
      vendor_id: request.vendor_id,
      product_name: request.product_name || '',
      quantity: request.quantity || 1,
      estimated_amount: request.estimated_amount || 0,
      department: request.department || 'General',
      requested_by: request.requested_by || '',
      priority: request.priority || 'Medium',
      justification: request.justification || '',
      expected_delivery_date: request.expected_delivery_date || ''
    };
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingRequest = null;
  }

  saveRequest(): void {
    if (!this.form.vendor_id) return this.toastService.show('Please select a vendor.', 'error');
    if (!this.form.product_name.trim()) return this.toastService.show('Item or service description is required.', 'error');
    if (this.form.quantity <= 0) return this.toastService.show('Quantity must be greater than 0.', 'error');
    if (!this.form.department.trim()) return this.toastService.show('Department is required.', 'error');
    if (!this.form.expected_delivery_date) return this.toastService.show('Needed by date is required.', 'error');
    if (this.form.estimated_amount < 0) return this.toastService.show('Estimated amount cannot be negative.', 'error');

    const data: any = {
      vendor_id: Number(this.form.vendor_id),
      product_name: this.form.product_name.trim(),
      quantity: Number(this.form.quantity),
      estimated_amount: Number(this.form.estimated_amount),
      department: this.form.department.trim(),
      expected_delivery_date: this.form.expected_delivery_date,
      requested_by: this.form.requested_by.trim(),
      priority: this.form.priority,
      justification: this.form.justification.trim()
    };

    const request$ = this.editingRequest
      ? this.procurementService.updateProcurementRequest(this.editingRequest.id, data)
      : this.procurementService.createProcurementRequest(data);

    request$.subscribe({
      next: () => {
        this.toastService.show(
          this.editingRequest ? 'Procurement request updated successfully!' : 'Procurement request created successfully!',
          'success'
        );
        this.closeForm();
        this.loadRequests();
      },
      error: error => this.toastService.show(error?.error?.detail || 'Failed to save procurement request.', 'error')
    });
  }

  approveRequest(request: any): void {
    if (request.status !== 'Pending') return;
    if (!confirm('Are you sure you want to approve this procurement request?')) return;
    this.procurementService.approveProcurementRequest(request.id).subscribe({
      next: () => {
        request.status = 'Approved';
        this.toastService.show('Procurement request approved!', 'success');
        this.loadRequests();
      },
      error: error => this.toastService.show(error?.error?.detail || 'Failed to approve request.', 'error')
    });
  }

  rejectRequest(request: any): void {
    if (request.status !== 'Pending') return;
    if (!confirm('Are you sure you want to reject this procurement request?')) return;
    this.procurementService.rejectProcurementRequest(request.id).subscribe({
      next: () => {
        this.toastService.show('Procurement request rejected!', 'success');
        this.loadRequests();
      },
      error: error => this.toastService.show(error?.error?.detail || 'Failed to reject request.', 'error')
    });
  }

  createOrder(request: any): void {
    if (request.status !== 'Approved') return;
    if (!confirm('Create a purchase order from this approved request?')) return;
    this.procurementService.createOrderFromProcurement(request.id).subscribe({
      next: () => {
        this.toastService.show('Purchase order created successfully!', 'success');
        request.status = 'Ordered';
        this.loadRequests();
        this.loadOrders();
      },
      error: error => this.toastService.show(error?.error?.detail || 'Failed to create purchase order.', 'error')
    });
  }

  deleteRequest(id: number): void {
    if (!confirm('Are you sure you want to delete this procurement request?')) return;
    this.procurementService.deleteProcurementRequest(id).subscribe({
      next: () => {
        this.toastService.show('Procurement request deleted successfully!', 'success');
        this.loadRequests();
      },
      error: error => this.toastService.show(error?.error?.detail || 'Failed to delete procurement request.', 'error')
    });
  }

  // ---------------- Purchase order flow ----------------

  openDirectOrderForm(): void {
    this.orderForm = {
      vendor_id: null,
      expected_delivery_date: '',
      payment_terms: 'Advance',
      shipping_mode: 'Standard',
      status: 'Pending'
    };
    this.lineItems = [{ product_name: '', quantity: 1, unit_price: 0 }];
    this.showOrderForm = true;
  }

  closeOrderForm(): void {
    this.showOrderForm = false;
  }

  selectOrderVendor(id: number): void {
    this.orderForm.vendor_id = id;
  }

  addLineItem(): void {
    this.lineItems.push({ product_name: '', quantity: 1, unit_price: 0 });
  }

  removeLineItem(index: number): void {
    if (this.lineItems.length === 1) return;
    this.lineItems.splice(index, 1);
  }

  lineTotal(item: any): number {
    return (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
  }

  get orderTotal(): number {
    return Number(this.lineItems.reduce((sum, item) => sum + this.lineTotal(item), 0).toFixed(2));
  }

  saveDirectOrder(): void {
    if (!this.orderForm.vendor_id) return this.toastService.show('Please select a vendor.', 'error');
    if (!this.orderForm.expected_delivery_date) return this.toastService.show('Expected delivery date is required.', 'error');
    if (!this.lineItems.length || this.lineItems.some(i => !i.product_name.trim() || Number(i.quantity) <= 0 || Number(i.unit_price) < 0)) {
      return this.toastService.show('Please enter valid line item details.', 'error');
    }

    const first = this.lineItems[0];
    const data = {
      vendor_id: Number(this.orderForm.vendor_id),
      product_name: this.lineItems.map(i => i.product_name.trim()).join(', '),
      quantity: this.lineItems.reduce((sum, i) => sum + Number(i.quantity), 0),
      amount: this.orderTotal,
      status: this.orderForm.status,
      expected_delivery_date: this.orderForm.expected_delivery_date,
      payment_terms: this.orderForm.payment_terms,
      shipping_mode: this.orderForm.shipping_mode,
      line_items: this.lineItems
    };

    this.orderService.createOrder(data).subscribe({
      next: () => {
        this.toastService.show('Purchase order created successfully!', 'success');
        this.closeOrderForm();
        this.setTab('orders');
      },
      error: error => this.toastService.show(error?.error?.detail || 'Failed to create purchase order.', 'error')
    });
  }

  // ---------------- Order details ----------------

  openOrderDetails(order: any): void {
    this.selectedOrder = order;
    this.orderDetailTab = 'overview';
    this.showOrderDetails = true;
    this.orderService.getOrder(order.id).subscribe({
      next: response => {
        this.selectedOrder = response;
        this.cdr.detectChanges();
      },
      error: error => console.error('Failed to load order details:', error)
    });
  }

  closeOrderDetails(): void {
    this.showOrderDetails = false;
    this.selectedOrder = null;
  }

  getVendorName(vendorId: number | null): string {
    const vendor = this.vendors.find(v => v.id === vendorId);
    return vendor ? vendor.vendor_name : vendorId ? `Vendor #${vendorId}` : '—';
  }

  get filteredRequests(): any[] {
    let result = [...this.requests];
    if (this.selectedStatus !== 'All') result = result.filter(r => r.status === this.selectedStatus);
    const search = this.searchText.trim().toLowerCase();
    if (search) {
      result = result.filter(r =>
        (r.product_name || '').toLowerCase().includes(search) ||
        this.getVendorName(r.vendor_id).toLowerCase().includes(search)
      );
    }
    return result;
  }

  get filteredOrders(): any[] {
    let result = [...this.orders];
    if (this.orderStatus !== 'All') result = result.filter(o => o.status === this.orderStatus);
    const search = this.orderSearch.trim().toLowerCase();
    if (search) {
      result = result.filter(o =>
        (o.product_name || '').toLowerCase().includes(search) ||
        this.getVendorName(o.vendor_id).toLowerCase().includes(search) ||
        String(o.id).includes(search)
      );
    }
    return result;
  }

  getOrderLineItems(order: any): any[] {
    if (order?.line_items_json) {
      try {
        const parsed = JSON.parse(order.line_items_json);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch { /* fall back to the stored order row */ }
    }
    return [{
      product_name: order?.product_name || '—',
      quantity: order?.quantity || 0,
      unit_price: order?.quantity ? Number(order.amount || 0) / Number(order.quantity) : 0
    }];
  }

  formatDate(value: any): string {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
