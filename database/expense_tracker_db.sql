CREATE TYPE user_role AS ENUM ('user', 'admin');

CREATE TABLE
    IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        profile_image_url TEXT,
        date_of_birth DATE,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role user_role NOT NULL DEFAULT 'user',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        password_changed_at TIMESTAMPTZ,
        password_reset_token TEXT,
        password_reset_expires TIMESTAMPTZ
    );

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE
    IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        category_name CITEXT NOT NULL UNIQUE
    );

CREATE TYPE expense_type AS ENUM ('inc', 'exp');

CREATE TABLE
    IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        description VARCHAR(255) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
        expense_type expense_type NOT NULL,
        category_id INT NOT NULL,
        expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        CONSTRAINT fk_expenses_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_expenses_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
    );

CREATE TABLE
    IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
        month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
        year SMALLINT NOT NULL CHECK (year >= 2000),
        CONSTRAINT fk_budget_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT uq_user_month_year UNIQUE (user_id, month, year)
    );