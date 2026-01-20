import jwt from 'jsonwebtoken';
import { config } from '@/config/env';
import { JWTPayload } from '@/types';

export const generateToken = (payload: {
  userId: string;
  phoneNumber: string;
  verified: boolean;
}): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as unknown as number,
  });
};

export const generateRefreshToken = (payload: {
  userId: string;
  phoneNumber: string;
  verified: boolean;
}): string => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as unknown as number,
  });
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.jwt.secret) as JWTPayload;
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.jwt.refreshSecret) as JWTPayload;
};

