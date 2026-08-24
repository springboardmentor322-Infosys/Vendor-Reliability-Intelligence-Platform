import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Contracts } from './contracts';

describe('Contracts', () => {
  let component: Contracts;
  let fixture: ComponentFixture<Contracts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Contracts],
    }).compileComponents();

    fixture = TestBed.createComponent(Contracts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
