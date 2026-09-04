import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditVendor } from './edit-vendor';

describe('EditVendor', () => {
  let component: EditVendor;
  let fixture: ComponentFixture<EditVendor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditVendor],
    }).compileComponents();

    fixture = TestBed.createComponent(EditVendor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
