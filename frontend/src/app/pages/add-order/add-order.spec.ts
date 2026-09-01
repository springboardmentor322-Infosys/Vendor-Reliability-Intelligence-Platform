import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddOrder } from './add-order';

describe('AddOrder', () => {
  let component: AddOrder;
  let fixture: ComponentFixture<AddOrder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddOrder],
    }).compileComponents();

    fixture = TestBed.createComponent(AddOrder);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
