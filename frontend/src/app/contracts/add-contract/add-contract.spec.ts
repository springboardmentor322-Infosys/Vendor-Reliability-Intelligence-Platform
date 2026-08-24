import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddContract } from './add-contract';

describe('AddContract', () => {
  let component: AddContract;
  let fixture: ComponentFixture<AddContract>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddContract],
    }).compileComponents();

    fixture = TestBed.createComponent(AddContract);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
