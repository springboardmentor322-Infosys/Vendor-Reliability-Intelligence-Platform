import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorList } from './vendor-list';

describe('VendorList', () => {
  let component: VendorList;
  let fixture: ComponentFixture<VendorList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorList],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
