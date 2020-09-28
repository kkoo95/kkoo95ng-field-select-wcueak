import { Injectable } from "@angular/core";
import { noop } from "rxjs";
import { ObjectUtils } from "./object-utils";
import { ValidatorFn, AbstractControl, ValidationErrors } from "@angular/forms";

function isString(v: any): v is String {
  return v && typeof v == 'string';
}

export type ElementMatcher<T> = (a: T, b: T) => boolean;

// @dynamic
@Injectable({
  providedIn: 'root'
})
export class ArrayUtils {


  /**
   * Finds the first element in the array where predicate is true and replaces that element with
   * the provided one. Returns the provided array.
   */
  static replace<T>(array: T[], element: T, predicate: (el: T, i: number, arr: T[]) => boolean) {
    let fn = predicate || ((el) => {
      return el === element;
    });
    let idx = array.findIndex(fn);

    if (idx != -1) {
      return array.splice(idx, 1, element);
    }
    return array;
  }

  /**
   * Finds the first element in the iterable where predicate is true
   */
  static find<T>(elements: Iterable<T>, predicate: (e: T, i: number, ii: Iterable<T>) => boolean): T {
    if (elements == null) {
      return null;
    }

    let it = elements[Symbol.iterator]();
    let next = it.next();
    let i = 0;

    while (!next.done) {
      if (predicate(next.value, i++, elements)) {
        return next.value;
      }
      next = it.next();
    }

    return null;
  }

  static *filter<T>(elements: Iterable<T>, predicate: (e: T, i: number, ii: Iterable<T>) => boolean): Iterable<T> {
    if (elements == null) {
      return null;
    }

    let it = elements[Symbol.iterator]();
    let next = it.next();
    let i = 0;

    while (!next.done) {
      if (predicate(next.value, i++, elements)) {
        yield next.value;
      }
      next = it.next();
    }
  }

  static *map<T>(elements: Iterable<T>, transform: (e: T, i: number, ii: Iterable<T>) => boolean) {
    if (elements == null) {
      return null;
    }

    let it = elements[Symbol.iterator]();
    let next = it.next();
    let i = 0;

    while (!next.done) {
      yield transform(next.value, i++, elements);
      next = it.next();
    }
  }

  static findElement<T>(elements: Iterable<T>, target: T, propertyPath?: string, matcher?: ElementMatcher<T>): T
  static findElement(elements: Iterable<string>, target: string, caseInsensitive?: boolean): string

  static findElement<T>(elements: any, target: any, arg2: any, matcher?: ElementMatcher<T>): T {
    if (elements == null) {
      return null;
    }
    return ArrayUtils.find(elements, this.createElementPredicate(target, arg2, matcher))
  }

  static createElementPredicate<T>(target: T, propertyPath?: string, matcher?: ElementMatcher<T>): (e: T, i: number, ii: Iterable<T>) => boolean;
  static createElementPredicate<T>(target: string, caseInsensitive?: boolean): (e: T, i: number, ii: Iterable<T>) => boolean;

  static createElementPredicate<T>(target: any, arg1: any, mather?: ElementMatcher<T>): (e: T, i: number, ii: Iterable<T>) => boolean {
    let itemResolution: (item: T) => any = item => ObjectUtils.resolveNested(item, arg1);
    let match = mather || ((candidate: T, matchee: any) => itemResolution(candidate) === matchee);

    // caseInsensitive strings signature
    if (arg1 === true) {
      target = target.toUpperCase();
      itemResolution = (item: T) => isString(item) ? item.toUpperCase() : item
    }

    return item => match(item, target);
  }

  /***
   * Flatten a tree of objects T  to an Array of T
   * @param root
   *    the root of the tree. Note that the param should be a single root and not an array.
   * @param getChildren
   *    a function that determine how to retrieve element's node. please see the example.
   * @return an array of the flatten tree.
   *
   * @example
   *
   * let tree = {
   *   id : 0,
   *   nodes : [{id: 2 }, {id: 3 }];
   * }
   * flatten(tree , node => node.children || []);
   * // [{id: 0, nodes : [{id: 2 }, {id: 3 }] }{id: 2 }, {id: 3 }]
   */
  static flatten<T>(root: T, getChildren: ((_: T) => Array<T>)): Array<T> {
    return Array.prototype.concat.apply(
      root,
      getChildren(root).map((x: any) => ArrayUtils.flatten(x || [], getChildren))
    );
  }

  /**
   * converts an array to a mapping object using the provided key. null items are ignored.
   * If a null key is provided, mapped values are null. If an empty key is provided, mapped values will be array items
   * @example
   * keyBy(['a', '', null, 'f', 'v', 'b'], null) // {a: null, f: null, v: null, b: null}
   * keyBy(['a', '', null, 'f', 'v', 'b'], '') // {a: "a", f: "f", v: "v", b: "b"}
   * keyBy(['a', '', null, 'f', 'v', 'b'], 'id') // {undefined: "b"}
   * keyBy([{id:1,val:'a'}, {id:2,val:'b'}, {val:'c'}, {id:2,val:'d'}, null], null) // {[object Object]: null}
   * keyBy([{id:1,val:'a'}, {id:2,val:'b'}, {val:'c'}, {id:2,val:'d'}, null], '') // {[object Object]: {id: 2, val: "d"}}
   * keyBy([{id:1,val:'a'}, {id:2,val:'b'}, {val:'c'}, {id:2,val:'d'}, null], 'id') // {1: {id: 1, val: "a"}, 2: {id: 2, val: "d"}, undefined: {val: "c"}}
   */
  static keyBy<T extends any | null>(arr: T[], key: string): { [x: string]: T } {
    return arr.reduce((o, v) => (v && (o[key ? v[key] : String(v)] = key !== null ? v : null), o), {});
  }

  static intersection<T>(arr1: T[], arr2: T[], predicate?: ElementMatcher<T>): T[] {
    return arr1 == null || arr2 == null ? [] : arr1.filter(a1 => this.findElement(arr2, a1, null, predicate) != null);
  }

  // Used for easily differentiating between `null` and actual `object` 
  private static getTypeForFilter(val: any): string {
    return (val === null) ? 'null' : typeof val;
  } 

  // static exists<T>(elements: Iterable<T>, propertyPath?: string, predicate?: ElementMatcher<T>): ValidatorFn {
  //   return (c: AbstractControl): ValidationErrors | null => {
  //     if (c.value == null) {
  //       return null;
  //     }

  //     let findFn

  //     if (predicate) {
  //       findFn = (v) => ArrayUtils.findElement(elements, v, predicate);
  //     }
  //     else {
  //       findFn = (v) => ArrayUtils.findElement(elements, v, propertyPath);
  //     }

  //     return findFn(c.value) == null ? { 'exists': true } : null;
      
  //   }
  // }

  constructor() {
  }
}

