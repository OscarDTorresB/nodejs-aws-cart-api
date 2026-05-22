import { Injectable } from '@nestjs/common';
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

@Injectable()
export class SecretsService {
  private readonly client: SecretsManagerClient | null = null;
  private cache: Record<string, string> = {};

  constructor() {
    if (process.env.NODE_ENV !== 'local') {
      this.client = new SecretsManagerClient();
    }
  }

  async getSecret<T = Record<string, string>>(secretArn: string): Promise<T> {
    if (!this.client) {
      return {} as T;
    }
    if (this.cache[secretArn]) {
      return this.cache[secretArn] as T;
    }

    const response = await this.client.send(
      new GetSecretValueCommand({ SecretId: secretArn }),
    );

    const parsed = JSON.parse(response.SecretString);
    this.cache[secretArn] = parsed;
    return parsed as T;
  }
}
