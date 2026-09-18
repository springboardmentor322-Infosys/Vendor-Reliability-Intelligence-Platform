import { TestBed } from '@angular/core/testing';

import { Procurement } from './procurement';

describe('Procurement', () => {
  let service: Procurement;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Procurement);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
