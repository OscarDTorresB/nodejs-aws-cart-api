#!/opt/homebrew/opt/node/bin/node
import * as cdk from 'aws-cdk-lib/core';
import { CartApiStack } from '../lib/cart-api-stack';

const app = new cdk.App();
new CartApiStack(app, 'CartApiStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  prefix: 'CartApiStack',
});
