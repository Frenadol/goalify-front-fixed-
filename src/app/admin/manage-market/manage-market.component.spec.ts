import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageMarketComponent } from './manage-market.component';

describe('ManageMarketComponent', () => {
  let component: ManageMarketComponent;
  let fixture: ComponentFixture<ManageMarketComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageMarketComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageMarketComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
