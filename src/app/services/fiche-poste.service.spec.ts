import { TestBed } from '@angular/core/testing';

import { FichePosteService } from './fiche-poste.service';

describe('FichePosteService', () => {
  let service: FichePosteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FichePosteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
