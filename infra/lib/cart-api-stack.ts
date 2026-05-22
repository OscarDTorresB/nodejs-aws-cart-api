import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { aws_apigateway, aws_lambda_nodejs } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib/core';
import * as path from 'node:path';

interface CartApiStackProps extends cdk.StackProps {
  prefix: string;
}

export class CartApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CartApiStackProps) {
    super(scope, id, props);

    const { prefix } = props;

    const nestJsLambda = new aws_lambda_nodejs.NodejsFunction(
      this,
      `${prefix}-Lambda-CartApi`,
      {
        entry: path.join(__dirname, '../../src/main.ts'),
        handler: 'handler',
        runtime: Runtime.NODEJS_24_X,
        timeout: Duration.seconds(30),
        memorySize: 1024,
        bundling: {
          externalModules: [
            '@nestjs/websockets/socket-module',
            '@nestjs/microservices/microservices-module',
            '@nestjs/microservices',
            'class-transformer',
            'class-validator',
          ],
        },
      },
    );

    const apiGateway = new aws_apigateway.RestApi(
      this,
      `${prefix}-ApiGateway`,
      {
        restApiName: `${prefix}-ApiGateway`,
        description: 'Cart API Gateway',
      },
    );

    const cartApiIntegration = new aws_apigateway.LambdaIntegration(
      nestJsLambda,
    );
    apiGateway.root.addMethod('ANY', cartApiIntegration);
    apiGateway.root.addProxy({
      defaultIntegration: cartApiIntegration,
    });
  }
}
