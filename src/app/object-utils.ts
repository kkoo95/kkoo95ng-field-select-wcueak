import { Injectable } from "@angular/core";

// @dynamic
@Injectable({
  providedIn: 'root'
})
export class ObjectUtils {

  /**
   * @deprecated This implementation is buggy. It wont actually copy Map or Sets
   * TODO(jar) add lodash dependency
   */
  static clone<T>(obj: T, full = false): T {
    let cloned: T;

    if (typeof obj === "object") {
      if (obj === null) return obj;

      if (obj instanceof Array) {
        let clonedArr: any[] = [];
        (cloned as any) = clonedArr;

        for (let i = 0; i < obj.length; ++i) {
          clonedArr.push(ObjectUtils.clone(obj[i]));
        }
      } else {
        cloned = new (Object.getPrototypeOf(obj).constructor)();

        for (let i in obj) {
          if (obj.hasOwnProperty(i) || full) {
            cloned[i] = ObjectUtils.clone(obj[i]);
          }
        }
      }
    } else {
      cloned = obj;
    }

    return cloned;
  }

  static isEmpty(o: any): boolean {
    return Object.keys(o).length == 0;
  }

  static isNotEmpty(o: any): boolean {
    return !this.isEmpty(o);
  }

  static values(o: any): any[] {
    return o && Object.keys(o).map(k => o[k]);
  }

  static forEach(o: any, iterator: (v: any, k: string) => void) {
    o && Object.keys(o).forEach(k => iterator(o[k], k));
  }

  static toMap<V>(o: { [x: string]: V }): Map<string, V>;
  static toMap<V>(o: { [x: number]: V }): Map<number, V>;

  static toMap<V>(o: any): Map<any, V> {
    return o == null ? null : Object.keys(o).reduce((m, k) => m.set(k, o[k]), new Map());
  }

  static mapEmptyStringPropertiesToNull(object: Object) {
    for (let key in object) {
      let property = object[key];
      if(property === '') {
        object[key] = null;
      } else if(property !== null && typeof property === 'object') {
        this.mapEmptyStringPropertiesToNull(property);
      }
    }
  }

  static resolveNested(obj: {}, path: string = null): any {
    if (obj == null || path == null) {
      return obj;
    }

    if (path.indexOf('.') === -1) {
      return obj[path];
    } else {
      let keys: string[] = path.split('.');
      let val = obj;

      for (let k in keys) {
        if (val == null) {
          break;
        }
        val = val[k];
      }

      return val;
    }
  }

}
