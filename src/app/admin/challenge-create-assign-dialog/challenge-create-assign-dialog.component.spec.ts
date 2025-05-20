import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChallengeCreateAssignDialogComponent } from './challenge-create-assign-dialog.component';

describe('ChallengeCreateAssignDialogComponent', () => {
  let component: ChallengeCreateAssignDialogComponent;
  let fixture: ComponentFixture<ChallengeCreateAssignDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChallengeCreateAssignDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChallengeCreateAssignDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
