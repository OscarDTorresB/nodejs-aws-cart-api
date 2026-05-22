import { Injectable } from '@nestjs/common';
import { CartEntity, CartItemEntity, CartStatuses } from '../entities';
import { PutCartPayload } from 'src/order/type';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartRepository: Repository<CartEntity>,
    @InjectRepository(CartItemEntity)
    private readonly cartItemRepository: Repository<CartItemEntity>,
  ) {}

  async findByUserId(userId: string): Promise<CartEntity | null> {
    return this.cartRepository.findOneBy({
      user_id: userId,
    });
  }

  async createByUserId(user_id: string): Promise<CartEntity> {
    const userCart = {
      user_id,
      status: CartStatuses.OPEN,
      items: [],
    };
    const userCartEntity = this.cartRepository.create(userCart);
    return this.cartRepository.save(userCartEntity);
  }

  async findOrCreateByUserId(userId: string): Promise<CartEntity> {
    const userCart = this.findByUserId(userId);

    if (userCart) {
      return userCart;
    }

    return this.createByUserId(userId);
  }

  async updateByUserId(
    userId: string,
    payload: PutCartPayload,
  ): Promise<CartEntity> {
    if (payload.count === 0) {
      await this.cartItemRepository.delete({
        product: {
          id: payload.product.id,
        },
      });
    } else {
      const cartItemEntity = this.cartItemRepository.create({
        product: payload.product,
        count: payload.count,
        cart: {
          user_id: userId,
        },
      });
      await this.cartItemRepository.save(cartItemEntity);
    }

    return this.findOrCreateByUserId(userId);
  }

  async removeByUserId(userId: string): Promise<void> {
    await this.cartRepository.delete({ user_id: userId });
  }
}
