import { NextFunction, Request, Response } from "express";
import HttpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error("GLOBAL ERROR:", err);

  let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
  let errorName = err?.name || "InternalServerError";
  let errorMessage = err?.message || "Internal server error";

  // Prisma Validation Error
  if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = HttpStatus.BAD_REQUEST;
    errorName = "ValidationError";
    errorMessage = "Invalid input. Please check the provided fields.";
  }

  // Prisma Known Request Error
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
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
    }
  }

  // Prisma Initialization Error
  else if (err instanceof Prisma.PrismaClientInitializationError) {
    statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    errorName = "DatabaseConnectionError";
    errorMessage = "Failed to connect to the database.";
  }

  // Prisma Rust Panic
  else if (err instanceof Prisma.PrismaClientRustPanicError) {
    statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    errorName = "DatabaseEngineError";
    errorMessage = "An unexpected database engine error occurred.";
  }

  // Prisma Unknown Request Error
  else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    errorName = "DatabaseError";
    errorMessage = "An unknown database error occurred.";
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    statusCode,
    name: errorName,
    message: errorMessage,

    // Development only
    ...(process.env.NODE_ENV === "development" && {
      error: err.stack,
    }),
  });
};
