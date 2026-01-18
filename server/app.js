const express = require("express");
const morgan = require("morgan");
const AppError = require("./utils/appError");
const categoryRouter = require("./routes/categoriesRoutes");

const app = express();

//1) Middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(express.json());

//2) Routes
app.use("/api/v1/categories", categoryRouter);

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on the server!`, 404));
});

module.exports = app;
