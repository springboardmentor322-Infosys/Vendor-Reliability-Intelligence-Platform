import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContractUploadComponent } from './contract-upload.component';

describe('ContractUploadComponent', () => {
  let component: ContractUploadComponent;
  let fixture: ComponentFixture<ContractUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractUploadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContractUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
