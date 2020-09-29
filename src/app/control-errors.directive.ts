import { Directive, ElementRef,  OnInit } from "@angular/core";
import { NgControl, ValidationErrors } from "@angular/forms";
import { tap } from "rxjs/operators";

@Directive({
  selector: '[formControlName],[formControl],[ngModel]'
})
export class FormControlErrorClassesDirective implements OnInit {

  protected readonly PREFIX = 'is-invalid';

  protected lastErrors: any[] = [];

  constructor(protected el: ElementRef<HTMLElement>,
              protected control: NgControl) {
  }

  ngOnInit(): void {
    let updateClasses = () => {
      this.updateClasses(this.control.errors);
    };

    this.control.statusChanges.pipe(tap(updateClasses)).subscribe();

    updateClasses();
  }

  protected updateClasses(errors: ValidationErrors) {
    this.lastErrors.forEach(error => {
      this.el.nativeElement.classList.remove(`${this.PREFIX}-${error}`);
    });

    this.lastErrors = [];

    if (errors != null) {
      Object.keys(errors).forEach(error => {
        this.lastErrors.push(error);
        this.el.nativeElement.classList.toggle(`${this.PREFIX}-${error}`, true)
      })
    }
  }

}