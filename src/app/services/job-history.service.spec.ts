import { TestBed } from '@angular/core/testing';

import { JobHistoryService } from './job-history.service';

describe('JobHistoryService', () => {
  let service: JobHistoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JobHistoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
