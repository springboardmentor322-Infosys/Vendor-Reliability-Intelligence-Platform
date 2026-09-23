import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProcurementAnalytics } from './procurement-analytics';

describe('ProcurementAnalytics', () => {
  let component: ProcurementAnalytics;
  let fixture: ComponentFixture<ProcurementAnalytics>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcurementAnalytics],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcurementAnalytics);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
