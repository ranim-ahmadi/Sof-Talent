import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagerSpaceComponent } from './manager-space.component';

describe('ManagerSpaceComponent', () => {
  let component: ManagerSpaceComponent;
  let fixture: ComponentFixture<ManagerSpaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManagerSpaceComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagerSpaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
