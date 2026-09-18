import { TestBed } from '@angular/core/testing';

import { Vendor } from './vendor';

describe('Vendor', () => {
  let service: Vendor;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Vendor);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
