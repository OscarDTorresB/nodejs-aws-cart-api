import { Module } from '@nestjs/common';

import { AppController } from './app.controller';

import { CartModule } from './cart/cart.module';
import { AuthModule } from './auth/auth.module';
import { OrderModule } from './order/order.module';
import { ConfigModule } from '@nestjs/config';
import { SecretsService } from './secrets';
import { SecretsModule } from './secrets/secrets.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    AuthModule,
    CartModule,
    OrderModule,
    ConfigModule.forRoot(),
    SecretsModule,
    TypeOrmModule.forRootAsync({
      imports: [SecretsModule],
      inject: [SecretsService],
      useFactory: async (secretsService: SecretsService) => {
        const secret = await secretsService.getSecret(
          process.env.DB_SECRET_ARN,
        );

        if (process.env.NODE_ENV === 'local') {
          return {
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'cloudx-user',
            password: 'cloudx-password',
            database: 'cloudx-db',
            autoLoadEntities: true,
            synchronize: true,
          };
        }

        return {
          type: 'postgres',
          host: secret.host,
          port: Number.parseInt(secret.port, 10),
          username: secret.username,
          password: secret.password,
          database: secret.dbname,
          autoLoadEntities: true,
          synchronize: true,
          ssl: {
            rejectUnauthorized: false,
          },
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [SecretsService],
})
export class AppModule {}
