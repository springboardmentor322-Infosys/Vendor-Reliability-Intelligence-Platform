import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorDashboard } from './vendor-dashboard';

describe('VendorDashboard', () => {
  let component: VendorDashboard;
  let fixture: ComponentFixture<VendorDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
