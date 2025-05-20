import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyChallengesListComponent } from './my-challenges-list.component';

describe('MyChallengesListComponent', () => {
  let component: MyChallengesListComponent;
  let fixture: ComponentFixture<MyChallengesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyChallengesListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyChallengesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
