import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorOrders } from './vendor-orders';

describe('VendorOrders', () => {
  let component: VendorOrders;
  let fixture: ComponentFixture<VendorOrders>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorOrders],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorOrders);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

