import { TestBed } from '@angular/core/testing';

import { Jornada } from './jornada';

describe('Jornada', () => {
  let service: Jornada;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Jornada);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
