import { NextFunction, Request, Response } from "express";
import HttpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.log(err);

  let statusCode;
  let errorName = err.name || "Internal server error";
  let errorMessage = err.message || "Internal server error";

  if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = HttpStatus.BAD_REQUEST;
    errorMessage = "Invalid input. Please check the provided fields.";
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2000":
        statusCode = HttpStatus.BAD_REQUEST;
        errorMessage = "The provided value is too long for one of the fields.";
        break;

      case "P2001":
        statusCode = HttpStatus.NOT_FOUND;
        errorMessage = "The requested record was not found.";
        break;

      case "P2002":
        statusCode = HttpStatus.CONFLICT;
        errorMessage = "A record with this value already exists.";
        break;

      case "P2003":
        statusCode = HttpStatus.BAD_REQUEST;
        errorMessage = "Invalid reference. Related record does not exist.";
        break;

      case "P2004":
        statusCode = HttpStatus.BAD_REQUEST;
        errorMessage =
          "The requested operation violates a database constraint.";
        break;

      case "P2005":
        statusCode = HttpStatus.BAD_REQUEST;
        errorMessage = "The provided value is invalid for this field.";
        break;

      case "P2006":
        statusCode = HttpStatus.BAD_REQUEST;
        errorMessage = "The provided value is not valid.";
        break;

      case "P2007":
        statusCode = HttpStatus.BAD_REQUEST;
        errorMessage = "Invalid data format.";
        break;

      case "P2008":
        statusCode = HttpStatus.BAD_REQUEST;
        errorMessage = "Failed to parse the query.";
        break;

      case "P2009":
        statusCode = HttpStatus.BAD_REQUEST;
        errorMessage = "Failed to validate the query.";
        break;

      case "P2010":
        statusCode = HttpStatus.BAD_REQUEST;
        errorMessage = "Raw query execution failed.";
        break;

      case "P2011":
        statusCode = HttpStatus.BAD_REQUEST;
        errorMessage = "A required field cannot be null.";
        break;

      case "P2012":
        statusCode = HttpStatus.BAD_REQUEST;
        errorMessage = "A required value is missing.";
        break;

      case "P2013":
        statusCode = HttpStatus.BAD_REQUEST;
        errorMessage = "A required argument is missing.";
        break;

      case "P2014":
        statusCode = HttpStatus.BAD_REQUEST;
        errorMessage =
          "The requested change would violate a required relation.";
        break;

      case "P2015":
        statusCode = HttpStatus.NOT_FOUND;
        errorMessage = "A related record could not be found.";
        break;

      case "P2016":
        statusCode = HttpStatus.BAD_REQUEST;
        errorMessage = "Query interpretation error.";
        break;

      case "P2017":
        statusCode = HttpStatus.BAD_REQUEST;
        errorMessage = "The related records are not connected.";
        break;

      case "P2018":
        statusCode = HttpStatus.NOT_FOUND;
        errorMessage = "A required connected record was not found.";
        break;

      case "P2019":
        statusCode = HttpStatus.BAD_REQUEST;
        errorMessage = "Input error.";
        break;

      case "P2020":
        statusCode = HttpStatus.BAD_REQUEST;
        errorMessage = "Value out of range.";
        break;

      case "P2021":
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        errorMessage = "The specified table does not exist.";
        break;

      case "P2022":
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        errorMessage = "The specified column does not exist.";
        break;

      case "P2025":
        statusCode = HttpStatus.NOT_FOUND;
        errorMessage = "The requested record was not found.";
        break;

      default:
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        errorMessage = "A database error occurred.";
        break;
    }
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    errorMessage = "Failed to connect to the database.";
  } else if (err instanceof Prisma.PrismaClientRustPanicError) {
    statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    errorMessage = "An unexpected database engine error occurred.";
  } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    errorMessage = "An unknown database error occurred.";
  }

  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    statusCode: statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
    name: errorName,
    message: errorMessage,
    error: err.stack,
  });
};
