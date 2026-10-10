-- Creating the `arolariu-sql` database:
IF DB_ID(N'arolariu-sql') IS NULL
BEGIN
    CREATE DATABASE [arolariu-sql] COLLATE SQL_Latin1_General_CP1_CI_AS;
END;
