export const env = {
  API_BASE_URL: 'http://localhost:4000/api/v1',
  WS_BASE_URL: 'http://localhost:4000',
  ENVIRONMENT: 'development',
} as const;

export type Environment = typeof env;
