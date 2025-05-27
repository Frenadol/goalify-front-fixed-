import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HabitDetailDialogComponent } from './habit-detail-dialog.component';

describe('HabitDetailDialogComponent', () => {
  let component: HabitDetailDialogComponent;
  let fixture: ComponentFixture<HabitDetailDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HabitDetailDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HabitDetailDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
