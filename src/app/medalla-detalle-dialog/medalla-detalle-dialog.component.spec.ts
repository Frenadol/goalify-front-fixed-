import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MedallaDetalleDialogComponent } from './medalla-detalle-dialog.component';

describe('MedallaDetalleDialogComponent', () => {
  let component: MedallaDetalleDialogComponent;
  let fixture: ComponentFixture<MedallaDetalleDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedallaDetalleDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MedallaDetalleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
