import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorContracts } from './vendor-contracts';

describe('VendorContracts', () => {
  let component: VendorContracts;
  let fixture: ComponentFixture<VendorContracts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorContracts],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorContracts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
