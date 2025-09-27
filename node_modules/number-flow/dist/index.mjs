import { d as i, N as u, f as r, r as c } from "./lite-BTIaQdTe.mjs";
import { D as _, c as v, p as E } from "./lite-BTIaQdTe.mjs";
import { continuous as N } from "./plugins.mjs";
const l = "number-flow-connect", m = "number-flow-update", d = (t, { locales: e, format: s, numberPrefix: n, numberSuffix: a } = {}) => {
  const o = r(t, new Intl.NumberFormat(e, s), n, a);
  return c(o);
};
class f extends u {
  constructor() {
    super(...arguments), this.connected = !1;
  }
  connectedCallback() {
    this.connected = !0, this.dispatchEvent(new Event(l, { bubbles: !0 }));
  }
  disconnectedCallback() {
    this.connected = !1;
  }
  get value() {
    return this._value;
  }
  update(e) {
    (!this._formatter || this._prevFormat !== this.format || this._prevLocales !== this.locales) && (this._formatter = new Intl.NumberFormat(this.locales, this.format), this._prevFormat = this.format, this._prevLocales = this.locales), e != null && (this._value = e), this.dispatchEvent(new Event(m, { bubbles: !0 })), this.data = r(this._value, this._formatter, this.numberPrefix, this.numberSuffix);
  }
}
i("number-flow", f);
export {
  l as CONNECT_EVENT,
  _ as Digit,
  m as UPDATE_EVENT,
  v as canAnimate,
  N as continuous,
  f as default,
  i as define,
  r as formatToData,
  E as prefersReducedMotion,
  d as renderInnerHTML
};
