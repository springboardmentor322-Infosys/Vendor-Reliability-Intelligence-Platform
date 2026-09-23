import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RiskAnalysis } from './risk-analysis';

describe('RiskAnalysis', () => {
  let component: RiskAnalysis;
  let fixture: ComponentFixture<RiskAnalysis>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskAnalysis],
    }).compileComponents();

    fixture = TestBed.createComponent(RiskAnalysis);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
