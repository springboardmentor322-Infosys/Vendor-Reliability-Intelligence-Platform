import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Communications } from './communications';

describe('Communications', () => {
  let component: Communications;
  let fixture: ComponentFixture<Communications>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Communications],
    }).compileComponents();

    fixture = TestBed.createComponent(Communications);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
