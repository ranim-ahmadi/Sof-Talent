import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FichePosteFormComponent } from './fiche-poste-form.component';

describe('FichePosteFormComponent', () => {
  let component: FichePosteFormComponent;
  let fixture: ComponentFixture<FichePosteFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FichePosteFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FichePosteFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
