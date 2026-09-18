import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Procurement } from './procurement';

describe('Procurement', () => {
  let component: Procurement;
  let fixture: ComponentFixture<Procurement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Procurement],
    }).compileComponents();

    fixture = TestBed.createComponent(Procurement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
