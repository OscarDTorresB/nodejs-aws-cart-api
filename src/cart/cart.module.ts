import { Module } from '@nestjs/common';

import { OrderModule } from '../order/order.module';

import { CartController } from './cart.controller';
import { CartService } from './services';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartEntity, CartItemEntity, ProductEntity } from './entities';

@Module({
  imports: [
    OrderModule,
    TypeOrmModule.forFeature([CartEntity, CartItemEntity, ProductEntity]),
  ],
  providers: [CartService],
  controllers: [CartController],
})
export class CartModule {}
