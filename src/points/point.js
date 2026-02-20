/**
 * A reactive 2D point. Fires onChange listeners when moved.
 */
export class Point {
  constructor(x = 0, y = 0) {
    this._x = x;
    this._y = y;
    this._listeners = [];
  }

  get x() { return this._x; }
  get y() { return this._y; }

  set x(v) { this._x = v; this._notify(); }
  set y(v) { this._y = v; this._notify(); }

  moveTo(x, y) {
    this._x = x;
    this._y = y;
    this._notify();
  }

  onChange(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(f => f !== fn);
    };
  }

  _notify() {
    for (const fn of this._listeners) fn(this);
  }
}
