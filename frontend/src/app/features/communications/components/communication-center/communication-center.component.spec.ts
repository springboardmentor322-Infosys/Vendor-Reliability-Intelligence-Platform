import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommunicationCenterComponent } from './communication-center.component';

describe('CommunicationCenterComponent', () => {
  let component: CommunicationCenterComponent;
  let fixture: ComponentFixture<CommunicationCenterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunicationCenterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommunicationCenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
