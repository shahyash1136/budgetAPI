const express = require("express");
const morgan = require("morgan");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const categoryRouter = require("./routes/categoriesRoutes");
const usersRouter = require("./routes/userRoutes");
const app = express();

//1) Middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(express.json());

//2) Routes
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/users", usersRouter);

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on the server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
