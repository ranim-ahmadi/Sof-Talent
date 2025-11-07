import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChooseCvActionsComponent } from './choose-cv-actions.component';

describe('ChooseCvActionsComponent', () => {
  let component: ChooseCvActionsComponent;
  let fixture: ComponentFixture<ChooseCvActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChooseCvActionsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChooseCvActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
