import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddVendor } from './add-vendor';

describe('AddVendor', () => {
  let component: AddVendor;
  let fixture: ComponentFixture<AddVendor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddVendor],
    }).compileComponents();

    fixture = TestBed.createComponent(AddVendor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
