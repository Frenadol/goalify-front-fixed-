import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MedallasDialogComponent } from './medallas-dialog.component';

describe('MedallasDialogComponent', () => {
  let component: MedallasDialogComponent;
  let fixture: ComponentFixture<MedallasDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedallasDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MedallasDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
