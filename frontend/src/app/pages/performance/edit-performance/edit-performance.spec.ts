import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPerformance } from './edit-performance';

describe('EditPerformance', () => {
  let component: EditPerformance;
  let fixture: ComponentFixture<EditPerformance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditPerformance],
    }).compileComponents();

    fixture = TestBed.createComponent(EditPerformance);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

