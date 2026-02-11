class APIFeatures {
  constructor(queryString, options = {}) {
    this.queryString = queryString;
    this.filters = [];
    this.sort = [];
    this.params = [];

    this.limit = 10;
    this.offsetValue = 0;

    this.columnMap = options.columnMap || {};
    this.defaultSort = options.defaultSort || "created_at DESC";
  }

  // STEP — Get real DB column
  getColumn(field) {
    return this.columnMap[field] || field;
  }

  // STEP — Base filter (like user_id)
  addBaseFilter(column, value) {
    this.params.push(value);
    this.filters.push(`${column} = $${this.params.length}`);
    return this;
  }

  // STEP — Filtering
  filter(allowedFilters) {
    const queryObj = { ...this.queryString };

    ["page", "sort", "limit", "fields"].forEach((el) => delete queryObj[el]);

    Object.entries(queryObj).forEach(([key, value]) => {
      if (allowedFilters.includes(key)) {
        const column = this.getColumn(key);

        this.params.push(value);
        this.filters.push(`${column} = $${this.params.length}`);
      }
    });

    return this;
  }

  // STEP — Sorting
  sorts(allowedSortFields) {
    if (!this.queryString.sort) return this;

    const sortFields = this.queryString.sort.split(",");

    sortFields.forEach((field) => {
      const direction = field.startsWith("-") ? "DESC" : "ASC";
      const cleanField = field.replace("-", "");

      if (allowedSortFields.includes(cleanField)) {
        const column = this.getColumn(cleanField);
        this.sort.push(`${column} ${direction}`);
      }
    });

    return this;
  }

  // STEP — Pagination
  pagination() {
    const limit = Math.min(Number(this.queryString.limit) || 10, 100);
    const page = Number(this.queryString.page) || 1;

    this.limit = limit;
    this.offsetValue = (page - 1) * limit;

    return this;
  }

  // STEP — Build Final Query
  buildQuery(baseQuery) {
    let finalQuery = baseQuery;

    if (this.filters.length) {
      finalQuery += ` WHERE ${this.filters.join(" AND ")}`;
    }

    if (this.sort.length) {
      finalQuery += ` ORDER BY ${this.sort.join(", ")}`;
    } else {
      finalQuery += ` ORDER BY ${this.defaultSort}`;
    }

    finalQuery += ` LIMIT ${this.limit} OFFSET ${this.offsetValue}`;

    return {
      query: finalQuery,
      params: this.params,
    };
  }
}

module.exports = APIFeatures;
