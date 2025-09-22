// assets/js/utils/BiodataChecker.js
export class BiodataChecker {
  static DEFAULT_FIELDS = [
    "name",
    "gender",
    "birthdate",
    "mobilecountrycode",
    "mobile",
    "address",
    "province_id",
    "province_name",
    "city_id",
    "city_name",
    "district_id",
    "district_name",
    "subdistrict_id",
    "subdistrict_name",
    "identitytype",
    "identityno",
    "profilepicture",
  ];

  /**
   * @param {string[]} fields - daftar key yang dicek
   * @param {{treatWhitespaceAsEmpty?: boolean}} options
   */
  constructor(fields = BiodataChecker.DEFAULT_FIELDS, options = {}) {
    this.fields = [...fields];
    this.opts = {
      treatWhitespaceAsEmpty: options.treatWhitespaceAsEmpty ?? true,
    };
  }

  /** Ganti daftar field (chainable) */
  setFields(fields) {
    this.fields = [...fields];
    return this;
  }

  /** Helper: definisi "kosong" */
  _isEmptyValue(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === "string") {
      if (this.opts.treatWhitespaceAsEmpty) return v.trim() === "";
      return v === "";
    }
    return false; // angka 0, boolean false, object/array dianggap TIDAK kosong
  }

  /** Sama seperti fungsi awal: true kalau SEMUA field kosong */
  isEmpty(data = {}) {
    return this.fields.every((k) => this._isEmptyValue(data?.[k]));
  }

  /** True kalau SEMUA field terisi (tidak kosong) */
  isComplete(data = {}) {
    return this.fields.every((k) => !this._isEmptyValue(data?.[k]));
  }

  /** Ada minimal SATU field terisi? */
  hasAny(data = {}) {
    return this.fields.some((k) => !this._isEmptyValue(data?.[k]));
  }

  /** Ambil daftar field yang masih kosong */
  missingFields(data = {}) {
    return this.fields.filter((k) => this._isEmptyValue(data?.[k]));
  }
}

/* Opsional: drop-in function biar kompatibel dengan kode lama */
export const isBiodataEmpty = (d = {}) => new BiodataChecker().isEmpty(d);
