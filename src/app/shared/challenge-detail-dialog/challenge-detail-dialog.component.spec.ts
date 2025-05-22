import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChallengeDetailDialogComponent } from './challenge-detail-dialog.component';

describe('ChallengeDetailDialogComponent', () => {
  let component: ChallengeDetailDialogComponent;
  let fixture: ComponentFixture<ChallengeDetailDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChallengeDetailDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChallengeDetailDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
