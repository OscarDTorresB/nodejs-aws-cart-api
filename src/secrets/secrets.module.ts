import { Global, Module } from '@nestjs/common';
import { SecretsService } from './services';

@Global()
@Module({
  providers: [SecretsService],
  exports: [SecretsService],
})
export class SecretsModule {}
