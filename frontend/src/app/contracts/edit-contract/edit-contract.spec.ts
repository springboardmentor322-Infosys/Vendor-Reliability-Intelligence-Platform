import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditContract } from './edit-contract';

describe('EditContract', () => {
  let component: EditContract;
  let fixture: ComponentFixture<EditContract>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditContract],
    }).compileComponents();

    fixture = TestBed.createComponent(EditContract);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
