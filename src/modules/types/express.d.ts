import { IJwtPayload } from "../modules/auth/auth.interface";

declare global {
  namespace Express {
    interface Request {
      user: IJwtPayload;
    }
  }
}

export {};
