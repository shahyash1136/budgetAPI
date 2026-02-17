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

  // --------------------------------
  // ✅ SEARCH (Already Added)
  // --------------------------------
  search(searchableFields = []) {
    if (!this.queryString.search) return this;

    const searchValue = this.queryString.search.trim();
    if (!searchValue) return this;

    const searchConditions = searchableFields.map((field) => {
      const column = this.getColumn(field);
      return `${column} ILIKE $${this.params.length + 1}`;
    });

    this.params.push(`%${searchValue}%`);
    this.filters.push(`(${searchConditions.join(" OR ")})`);

    return this;
  }

  // --------------------------------
  // ✅ ADVANCED FILTER ADDED HERE
  // --------------------------------
  filter(allowedFilters) {
    const queryObj = { ...this.queryString };

    ["page", "sort", "limit", "fields", "search"].forEach(
      (el) => delete queryObj[el],
    );

    Object.entries(queryObj).forEach(([key, value]) => {
      if (!allowedFilters.includes(key)) return;

      const column = this.getColumn(key);

      // -----------------------
      // ADVANCED FILTER OBJECT
      // -----------------------
      if (typeof value === "object" && value !== null) {
        Object.entries(value).forEach(([operator, opValue]) => {
          switch (operator) {
            case "gte":
              this.params.push(opValue);
              this.filters.push(`${column} >= $${this.params.length}`);
              break;

            case "lte":
              this.params.push(opValue);
              this.filters.push(`${column} <= $${this.params.length}`);
              break;

            case "gt":
              this.params.push(opValue);
              this.filters.push(`${column} > $${this.params.length}`);
              break;

            case "lt":
              this.params.push(opValue);
              this.filters.push(`${column} < $${this.params.length}`);
              break;

            case "between": {
              const [min, max] = opValue.split(",");

              this.params.push(min);
              this.params.push(max);

              this.filters.push(
                `${column} BETWEEN $${this.params.length - 1} AND $${this.params.length}`,
              );
              break;
            }

            default:
              break;
          }
        });
      }

      // -----------------------
      // NORMAL FILTER (OLD LOGIC)
      // -----------------------
      else {
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
    this.page = page;
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

  // Build Count Query
  buildCountQuery(baseQuery) {
    let finalQuery = `SELECT COUNT(*) ${baseQuery}`;

    if (this.filters.length) {
      finalQuery += ` WHERE ${this.filters.join(" AND ")}`;
    }

    return {
      query: finalQuery,
      params: this.params,
    };
  }
}

module.exports = APIFeatures;
