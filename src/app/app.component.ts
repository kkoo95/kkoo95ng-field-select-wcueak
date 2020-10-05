import { Component, VERSION, Directive, ElementRef, ViewChild } from '@angular/core';
import { FormControl, ControlValueAccessor, NG_VALUE_ACCESSOR, NgModel, Validators, FormBuilder, FormGroup } from '@angular/forms';
import { of, EMPTY, interval, timer, Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { debounceTime, timeInterval, timeout, flatMap, delay } from 'rxjs/operators';
import { ExistsValidatorDirective } from './exists-validator.directive';

const json = JSON.parse('[{"id":1,"name":"1.Leanne Graham","username":"Bret","email":"Sincere@april.biz","address":{"street":"Kulas Light","suite":"Apt. 556","city":"Gwenborough","zipcode":"92998-3874","geo":{"lat":"-37.3159","lng":"81.1496"}},"phone":"1-770-736-8031 x56442","website":"hildegard.org","company":{"name":"Romaguera-Crona","catchPhrase":"Multi-layered client-server neural-net","bs":"harness real-time e-markets"}},{"id":2,"name":"2.Ervin Howell","username":"Antonette","email":"Shanna@melissa.tv","address":{"street":"Victor Plains","suite":"Suite 879","city":"Wisokyburgh","zipcode":"90566-7771","geo":{"lat":"-43.9509","lng":"-34.4618"}},"phone":"010-692-6593 x09125","website":"anastasia.net","company":{"name":"Deckow-Crist","catchPhrase":"Proactive didactic contingency","bs":"synergize scalable supply-chains"}},{"id":3,"name":"3.Clementine Bauch","username":"Samantha","email":"Nathan@yesenia.net","address":{"street":"Douglas Extension","suite":"Suite 847","city":"McKenziehaven","zipcode":"59590-4157","geo":{"lat":"-68.6102","lng":"-47.0653"}},"phone":"1-463-123-4447","website":"ramiro.info","company":{"name":"Romaguera-Jacobson","catchPhrase":"Face to face bifurcated interface","bs":"e-enable strategic applications"}},{"id":4,"name":"4.Patricia Lebsack","username":"Karianne","email":"Julianne.OConner@kory.org","address":{"street":"Hoeger Mall","suite":"Apt. 692","city":"South Elvis","zipcode":"53919-4257","geo":{"lat":"29.4572","lng":"-164.2990"}},"phone":"493-170-9623 x156","website":"kale.biz","company":{"name":"Robel-Corkery","catchPhrase":"Multi-tiered zero tolerance productivity","bs":"transition cutting-edge web services"}},{"id":5,"name":"5.Chelsey Dietrich","username":"Kamren","email":"Lucio_Hettinger@annie.ca","address":{"street":"Skiles Walks","suite":"Suite 351","city":"Roscoeview","zipcode":"33263","geo":{"lat":"-31.8129","lng":"62.5342"}},"phone":"(254)954-1289","website":"demarco.info","company":{"name":"Keebler LLC","catchPhrase":"User-centric fault-tolerant solution","bs":"revolutionize end-to-end systems"}},{"id":6,"name":"6.Mrs. Dennis Schulist","username":"Leopoldo_Corkery","email":"Karley_Dach@jasper.info","address":{"street":"Norberto Crossing","suite":"Apt. 950","city":"South Christy","zipcode":"23505-1337","geo":{"lat":"-71.4197","lng":"71.7478"}},"phone":"1-477-935-8478 x6430","website":"ola.org","company":{"name":"Considine-Lockman","catchPhrase":"Synchronised bottom-line interface","bs":"e-enable innovative applications"}},{"id":7,"name":"7.Kurtis Weissnat","username":"Elwyn.Skiles","email":"Telly.Hoeger@billy.biz","address":{"street":"Rex Trail","suite":"Suite 280","city":"Howemouth","zipcode":"58804-1099","geo":{"lat":"24.8918","lng":"21.8984"}},"phone":"210.067.6132","website":"elvis.io","company":{"name":"Johns Group","catchPhrase":"Configurable multimedia task-force","bs":"generate enterprise e-tailers"}},{"id":8,"name":"8.Nicholas Runolfsdottir V","username":"Maxime_Nienow","email":"Sherwood@rosamond.me","address":{"street":"Ellsworth Summit","suite":"Suite 729","city":"Aliyaview","zipcode":"45169","geo":{"lat":"-14.3990","lng":"-120.7677"}},"phone":"586.493.6943 x140","website":"jacynthe.com","company":{"name":"Abernathy Group","catchPhrase":"Implemented secondary concept","bs":"e-enable extensible e-tailers"}}]')

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html'
})
export class AppComponent  {
  data1 = new FormControl(); 
  rule = '[ \\d]+';
  loading;
  shuffle = false;
  maxItem = 8;
  multiple = false;
  allowInvalid = false;
  items: any[] = this.slice(2, this.maxItem);
  data: any = !this.multiple ? 29 : [29];

  fc:FormControl;
  fg:FormGroup;

  status;
  dirty;
  fcstatus;
  fcdirty;

  dataModel: NgModel; 
  unsub = new Subscription();

  @ViewChild('dataModelDir', {static: false}) set _dataModel(v: NgModel) {
    this.unsub.unsubscribe()
    this.dataModel = v;

    if (this.dataModel) {
      this.unsub = new Subscription();
      this.unsub.add(v.valueChanges.subscribe(v => console.log('dataModel.valueChanges', v)));
      this.unsub.add(v.statusChanges.subscribe(_ => {
        console.log('dataModel.statusChanges', v.status, v.errors)
        this.status = JSON.stringify(v.errors)
        this.dirty = v.dirty
      }))
    }
  }

  show1 = false;
  show2 = true;

  constructor(protected http: HttpClient) {
    let existVal = new ExistsValidatorDirective();
    existVal.ngOnChanges(null);
    this.fc = new FormControl(null, [Validators.required, existVal.validate.bind(existVal)]);
    this.fg = new FormGroup({ data1: this.fc });

    this.fc.valueChanges.subscribe(v => !this.settingValue && console.log(' fc.ValueChanges', v));
    this.fc.statusChanges.subscribe(_ => { if(this.settingValue) return
      console.log(' fc.statusChanges', this.fc.errors)
      this.fcstatus = JSON.stringify(this.fc.errors)
      this.fcdirty = this.fc.dirty
    });
    this.fg.valueChanges.subscribe(v => !this.settingValue && console.log('  fg.valueChanges', v));
    this.fg.statusChanges.subscribe(_ => !this.settingValue && console.log('  fg.statusChanges', this.fg.status));
  }

  ngOnInit() {
    this.data = {};
    this.data = 0;
    this.items = this.slice(3, this.maxItem)
    this.fc.setValue(this.data)
    // this.reload(); 
    of(EMPTY).subscribe(_ => this.rule = '[ \\d]')
  }

  ngAfterViewInit() {
  }

  settingValue;
  setValue(v) {
    this.settingValue = false;
    this.data = v;
    if (v != this.fc.value)
      this.fc.setValue(v, { emitEvent: true })
    this.settingValue = false;
  }
  slice(s, e) {
    this.items = json.slice(s, e);
    return this.items;
  }

  get dataModelStatus() {
    return JSON.stringify(this.dataModel?.errors);
  }

  reload() {
    this.loading = true;

    // this.http.get('https://cors-anywhere.herokuapp.com/https://dummy.restapiexample.com/api/v1/employees')
    // this.http.get('https://jsonplaceholder.typicode.com/users')    
    of([...json])
      .pipe(
        delay(1000)
      )
      .subscribe((result: any) => {
        this.loading = false;
        this.items = this.shuffleArray(result).slice(0, this.maxItem);//.map(e => e.employee_name);
        if (this.data1.value == null) {
          // this.data1 = this.items[this.items.length - 1];
          this.data1.setValue({});
        }
      }, () => this.loading = false, () => this.loading = false)
  }

  shuffleArray(array: any[]) {
    for (var i = array.length - 1; this.shuffle && i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
  }

}
