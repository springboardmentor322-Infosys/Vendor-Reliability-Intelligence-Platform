import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddPerformance } from './add-performance';

describe('AddPerformance', () => {
  let component: AddPerformance;
  let fixture: ComponentFixture<AddPerformance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddPerformance],
    }).compileComponents();

    fixture = TestBed.createComponent(AddPerformance);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

