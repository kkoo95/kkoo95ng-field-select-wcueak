// property bindings example
import { FieldSelectComponent } from "./select.component";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { By } from "@angular/platform-browser";

describe("FieldSelectComponent", () => {
  let component: FieldSelectComponent;
  let fixture: ComponentFixture<FieldSelectComponent>;
  let dbgElement: ComponentFixture<any>;
  let element: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FieldSelectComponent]
    });
    fixture = TestBed.createComponent(FieldSelectComponent);
    component = fixture.componentInstance;

    // dbgElement = fixture.debugElement.query(By.css(".phone"));
    // element = dbgElement.nativeElement;

    fixture.detectChanges();
  });

  it("paragraph should contain default message", () => {
    expect(element.innerText).toContain("not specified");
  });

  it("paragraph should contain phone number", () => {
    // component.phone = "0021000111";

    fixture.detectChanges();

    expect(element.innerText).toContain("0021000111");
  });
});
