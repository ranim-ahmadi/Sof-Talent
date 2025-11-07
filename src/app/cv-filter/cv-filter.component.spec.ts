import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CvFilterComponent } from './cv-filter.component';

describe('CvFilterComponent', () => {
  let component: CvFilterComponent;
  let fixture: ComponentFixture<CvFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CvFilterComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CvFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
