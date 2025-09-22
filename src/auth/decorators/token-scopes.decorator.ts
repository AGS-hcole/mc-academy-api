import { SetMetadata } from '@nestjs/common';

export const TOKEN_SCOPES_KEY = 'token_scopes';
export const TokenScopes = (...scopes: string[]) =>
  SetMetadata(TOKEN_SCOPES_KEY, scopes);
