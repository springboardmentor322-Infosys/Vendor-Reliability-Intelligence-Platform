import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorPerformance } from './vendor-performance';

describe('VendorPerformance', () => {
  let component: VendorPerformance;
  let fixture: ComponentFixture<VendorPerformance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorPerformance],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorPerformance);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
