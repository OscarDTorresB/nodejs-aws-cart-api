import { Injectable } from '@nestjs/common';
import {
  CartEntity,
  CartItemEntity,
  CartStatuses,
  ProductEntity,
} from '../entities';
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
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
  ) {}

  async findByUserId(userId: string): Promise<CartEntity | null> {
    return this.cartRepository.findOne({
      where: {
        user_id: userId,
      },
      relations: {
        items: {
          product: true,
        },
      },
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
    const userCart = await this.findByUserId(userId);

    if (userCart) {
      return userCart;
    }

    return this.createByUserId(userId);
  }

  async updateByUserId(
    userId: string,
    payload: PutCartPayload,
  ): Promise<CartEntity> {
    const cart = await this.findOrCreateByUserId(userId);

    if (payload.count === 0) {
      await this.cartItemRepository.delete({
        cart: { id: cart.id },
        product: { id: payload.product.id },
      });
    } else {
      const existingItem = await this.cartItemRepository.findOne({
        where: {
          cart: { id: cart.id },
          product: { id: payload.product.id },
        },
      });

      if (existingItem) {
        await this.cartItemRepository.update(existingItem.id, {
          count: payload.count,
        });
      } else {
        const product = await this.productRepository.save(payload.product);
        const cartItemEntity = this.cartItemRepository.create({
          product,
          count: payload.count,
          cart: { id: cart.id },
        });
        await this.cartItemRepository.save(cartItemEntity);
      }
    }

    return this.findByUserId(userId);
  }

  async removeByUserId(userId: string): Promise<void> {
    await this.cartRepository.delete({ user_id: userId });
  }
}
