import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadJobDescriptionComponent } from './upload-job-description.component';

describe('UploadJobDescriptionComponent', () => {
  let component: UploadJobDescriptionComponent;
  let fixture: ComponentFixture<UploadJobDescriptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UploadJobDescriptionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UploadJobDescriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
