import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import {
  aws_apigateway,
  aws_ec2,
  aws_lambda_nodejs,
  aws_rds,
  aws_secretsmanager,
} from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as path from 'node:path';
import { InterfaceVpcEndpointAwsService } from 'aws-cdk-lib/aws-ec2';

interface CartApiStackProps extends StackProps {
  prefix: string;
}

export class CartApiStack extends Stack {
  constructor(scope: Construct, id: string, props: CartApiStackProps) {
    super(scope, id, props);

    const { prefix } = props;

    /* Networking */
    const vpc = new aws_ec2.Vpc(this, `${prefix}-VPC`, {
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: `${prefix}-PrivateSubnet`,
          subnetType: aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
      natGateways: 0,
    });

    /* VPC endpoints - Creates net interfaces for AWS services */
    vpc.addInterfaceEndpoint(`${prefix}-VPCEndpoint-SecretsManager`, {
      service: InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    });

    /* Security Groups */
    const lambdaSecurityGroup = new aws_ec2.SecurityGroup(
      this,
      `${prefix}-LambdaSecurityGroup`,
      {
        vpc,
        allowAllOutbound: true,
        description: 'Security Group for Lambda Functions',
      },
    );
    const rdsSecurityGroup = new aws_ec2.SecurityGroup(
      this,
      `${prefix}-RdsSecurityGroup`,
      {
        vpc,
        allowAllOutbound: false,
        description: 'Security Group for RDS Database',
      },
    );

    rdsSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      aws_ec2.Port.tcp(5432),
      'Allow RDS access from Lambda',
    );

    /* Secrets */
    const cartDbCredentialsSecret = new aws_secretsmanager.Secret(
      this,
      `${prefix}-RdsCredentialsSecret`,
      {
        secretName: 'cart-db-credentials',
        generateSecretString: {
          secretStringTemplate: JSON.stringify({ username: 'cloudx_admin' }),
          generateStringKey: 'password',
          excludePunctuation: true,
        },
      },
    );

    /* RDS Database */
    const cartDbInstance = new aws_rds.DatabaseInstance(
      this,
      `${prefix}-RdsDatabase`,
      {
        engine: aws_rds.DatabaseInstanceEngine.postgres({
          version: aws_rds.PostgresEngineVersion.VER_18_3,
        }),
        instanceType: aws_ec2.InstanceType.of(
          aws_ec2.InstanceClass.BURSTABLE4_GRAVITON,
          aws_ec2.InstanceSize.MICRO,
        ),
        vpc,
        vpcSubnets: { subnetType: aws_ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroups: [rdsSecurityGroup],
        credentials: aws_rds.Credentials.fromSecret(cartDbCredentialsSecret),
        multiAz: false,
        allocatedStorage: 20,
        removalPolicy: RemovalPolicy.DESTROY,
        backupRetention: Duration.days(1),
      },
    );

    /* Api Lambda */
    const cartApiLambda = new aws_lambda_nodejs.NodejsFunction(
      this,
      `${prefix}-Lambda-CartApi`,
      {
        entry: path.join(__dirname, '../../src/main.ts'),
        handler: 'handler',
        runtime: Runtime.NODEJS_24_X,
        timeout: Duration.seconds(30),
        memorySize: 1024,
        vpc,
        vpcSubnets: { subnetType: aws_ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroups: [lambdaSecurityGroup],
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
    cartDbCredentialsSecret.grantRead(cartApiLambda);

    /* API Gateway */
    const apiGateway = new aws_apigateway.RestApi(
      this,
      `${prefix}-ApiGateway`,
      {
        restApiName: `${prefix}-ApiGateway`,
        description: 'Cart API Gateway',
      },
    );

    const cartApiIntegration = new aws_apigateway.LambdaIntegration(
      cartApiLambda,
    );
    apiGateway.root.addMethod('ANY', cartApiIntegration);
    apiGateway.root.addProxy({
      defaultIntegration: cartApiIntegration,
    });
  }
}
