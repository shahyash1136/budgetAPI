class APIFeatures {
  constructor(queryString) {
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludeFields = ["page", "sort", "limit", "fields"];
    excludeFields.forEach((el) => {
      delete queryObj[el];
    });

    return this;
  }
}

module.exports = APIFeatures;
