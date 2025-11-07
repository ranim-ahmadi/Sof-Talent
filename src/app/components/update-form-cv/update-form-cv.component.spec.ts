import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateFormCvComponent } from './update-form-cv.component';

describe('UpdateFormCvComponent', () => {
  let component: UpdateFormCvComponent;
  let fixture: ComponentFixture<UpdateFormCvComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UpdateFormCvComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateFormCvComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
