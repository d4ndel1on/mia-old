import * as path from 'path'
import { IdentityPool, UserPoolAuthenticationProvider } from '@aws-cdk/aws-cognito-identitypool-alpha'
import { CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib'
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager'
import {
  CfnUserPoolGroup,
  ProviderAttribute,
  StringAttribute,
  UserPool,
  UserPoolClient,
  UserPoolDomain,
  UserPoolIdentityProviderApple,
  UserPoolIdentityProviderGoogle,
  UserPoolOperation,
  UserPoolProps,
  VerificationEmailStyle,
} from 'aws-cdk-lib/aws-cognito'
import { UserPoolIdentityProviderBase } from 'aws-cdk-lib/aws-cognito/lib/user-pool-idps/private/user-pool-idp-base'
import { AttributeType, Billing, TableEncryptionV2, TableV2 } from 'aws-cdk-lib/aws-dynamodb'
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53'
import { UserPoolDomainTarget } from 'aws-cdk-lib/aws-route53-targets'
import { Construct } from 'constructs'
import { MiaIdentityProvider, MiaIdentityProviderApple, MiaIdentityProviderGoogle } from './utils/MiaIdentityProvider'

/**
 * Properties to create a cognito instance
 */
export interface MiaUserManagementProps extends UserPoolProps {
}

/**
 * Properties to add a new user group
 */
export interface MiaAddUserGroupProps {
  /**
   * Name of the user group. Returned in the cognito access token for access control.
   */
  groupName: string;
  /**
   * Optional role arn of the user group
   */
  roleArn?: string;
  /**
   * Optional description of the user group
   */
  description?: string;
}

/**
 * Properties to add a custom domain
 */
export interface MiaAddCustomDomainProps {
  /**
   * Arn of the certificate that contains the cname or hosted zone name
   */
  certificateArn: string;
  /**
   * Domain name of the hosted zone
   */
  domainName: string;
  /**
   * Hosted zone id of the hosted zone
   */
  hostedZoneId: string;
  /**
   * Subdomain of the hosted zone, that will serve the domain
   */
  cname: string | undefined;
}

/**
 * Response when adding a custom domain
 */
export interface MiaAddCustomDomainResponse {
  /**
   * The created user pool domain
   */
  userPoolDomain: UserPoolDomain;
  /**
   * The created a record
   */
  aRecord: ARecord;
}

/**
 * Properties for adding an identity provider
 */
export interface MiaAddIdentityProviderProps {
  providers: MiaIdentityProvider[];
}

/**
 * Response when adding an identity provider
 */
export interface MiaAddIdentityProviderResponse {
  /**
   * UserPoolIdentityProviders that were be created.
   */
  identityProviders: UserPoolIdentityProviderBase[];
  /**
   * UserPoolClient that was created.
   */
  userPoolWebClient: UserPoolClient;
  /**
   * Created IdentityPool.
   */
  identityPool: IdentityPool;
}

/**
 * Properties for adding a post confirmation lambda
 */
export interface MiaAddPostConfirmationLambdaProps {
  /**
   * Optional NodejsFunction properties to create. If absent, best practices are used.
   */
  lambda?: Partial<NodejsFunctionProps>;
}

/**
 * Allows to add a cognito instance with post confirmation lambda and identity providers
 */
export class MiaUserManagement {
  readonly id: string
  readonly scope: Construct
  readonly userPool: UserPool
  readonly table: TableV2
  identityPool: IdentityPool | undefined

  constructor(scope: Construct, id: string, props?: MiaUserManagementProps) {
    this.id = id
    this.scope = scope
    this.table = new TableV2(this.scope, `${id}Table`, {
      removalPolicy: RemovalPolicy.RETAIN,
      partitionKey: {
        type: AttributeType.STRING,
        name: 'sub',
      },
      sortKey: {
        type: AttributeType.STRING,
        name: 'type',
      },
      billing: Billing.onDemand(),
      deletionProtection: true,
      encryption: TableEncryptionV2.dynamoOwnedKey(),
      timeToLiveAttribute: 'ttl',
    })
    this.userPool = new UserPool(scope, `${id}UserPool`, {
      signInCaseSensitive: false,
      signInAliases: {
        email: true,
      },
      standardAttributes: {
        email: {
          mutable: true,
          required: true,
        },
        nickname: {
          mutable: true,
          required: true,
        },
        profilePicture: {
          mutable: true,
          required: true,
        },
      },
      selfSignUpEnabled: true,
      customAttributes: {
        id: new StringAttribute({ minLen: 22, maxLen: 32, mutable: false }),
      },
      userVerification: {
        emailStyle: VerificationEmailStyle.CODE,
      },
      passwordPolicy: {
        minLength: 9,
        requireDigits: true,
        requireUppercase: true,
        requireSymbols: true,
        requireLowercase: true,
      },
      ...props,
    })

    new CfnOutput(this.scope, `${this.id}${id}CognitoUserPool`, {
      value: this.userPool.userPoolId,
      exportName: `${this.id}:${id}:CognitoUserPool:Id`,
    })
  }

  addUserGroup = (
    id: string,
    { groupName, description, roleArn }: MiaAddUserGroupProps,
  ) => {
    const userGroup = new CfnUserPoolGroup(
      this.scope,
      `${this.id}GroupUser${id}`,
      {
        userPoolId: this.userPool.userPoolId,
        description: description || `${this.id} user group ${groupName}`,
        groupName,
        roleArn,
      },
    )
    new CfnOutput(this.scope, `${this.id}${id}CognitoUserGroup`, {
      value: userGroup.groupName!,
      exportName: `${this.id}:${id}:CognitoUserGroup:User:Name`,
    })
    return userGroup
  }

  addCustomDomain = (
    id: string,
    { certificateArn, domainName, hostedZoneId, cname }: MiaAddCustomDomainProps,
  ): MiaAddCustomDomainResponse => {
    const certificate = Certificate.fromCertificateArn(
      this.scope,
      `${this.id}UserPoolDomainCert${id}`,
      certificateArn,
    )
    const zone = HostedZone.fromHostedZoneAttributes(
      this.scope,
      `${this.id}UserPoolDomainZone${id}`,
      { zoneName: domainName, hostedZoneId },
    )
    const userPoolDomain = new UserPoolDomain(
      this.scope,
      `${this.id}UserPoolDomain${id}`,
      {
        userPool: this.userPool,
        customDomain: {
          certificate,
          domainName: cname ? `${cname}.${zone.zoneName}` : zone.zoneName,
        },
      },
    )
    const aRecord = new ARecord(
      this.scope,
      `${this.id}UserPoolDomainARecord${id}`,
      {
        zone,
        ttl: Duration.days(1),
        target: RecordTarget.fromAlias(
          new UserPoolDomainTarget(userPoolDomain),
        ),
        recordName: cname ? cname : zone.zoneName,
      },
    )
    new CfnOutput(this.scope, `${this.id}${id}CognitoDomainHost`, {
      value: userPoolDomain.domainName,
      exportName: `${this.id}:${id}:CognitoDomainHost`,
    })
    new CfnOutput(
      this.scope,
      `${this.id}${id}AuthorizedRedirectUserPoolDomainUrl`,
      {
        value: `https://${userPoolDomain.domainName}/oauth2/idpresponse`,
        exportName: `${this.id}:${id}:AuthorizedRedirectUserPoolDomainUrl`,
      },
    )
    return { aRecord, userPoolDomain }
  }

  addIdentityProviders = ({
    providers,
  }: MiaAddIdentityProviderProps): MiaAddIdentityProviderResponse => {
    const identityProviders = providers.map((p) => {
      if (p instanceof MiaIdentityProviderGoogle) {
        const identityProvider = new UserPoolIdentityProviderGoogle(
          this.scope,
          `${this.id}UserPoolIdentityProviderGoogle`,
          {
            userPool: this.userPool,
            clientId: p.clientId.getValue(
              this.scope,
              `${this.id}UserPoolIdentityProviderGoogleClientId`,
            ),
            clientSecretValue: p.clientSecret.getSecretValue(),
            scopes: ['openid', 'profile', 'email'],
            attributeMapping: {
              email: ProviderAttribute.GOOGLE_EMAIL,
              givenName: ProviderAttribute.GOOGLE_GIVEN_NAME,
              familyName: ProviderAttribute.GOOGLE_FAMILY_NAME,
              profilePicture: ProviderAttribute.GOOGLE_PICTURE,
            },
          },
        )
        this.userPool.registerIdentityProvider(identityProvider)
        return identityProvider
      }
      if (p instanceof MiaIdentityProviderApple) {
        const identityProvider = new UserPoolIdentityProviderApple(
          this.scope,
          `${this.id}UserPoolIdentityProviderApple`,
          {
            userPool: this.userPool,
            clientId: p.clientId.getValue(
              this.scope,
              `${this.id}UserPoolIdentityProviderAppleClientId`,
            ),
            keyId: p.keyId.getValue(
              this.scope,
              `${this.id}UserPoolIdentityProviderAppleKeyId`,
            ),
            teamId: p.teamId.getValue(
              this.scope,
              `${this.id}UserPoolIdentityProviderAppleTeamId`,
            ),
            privateKey: p.privateKey.getValue(
              this.scope,
              `${this.id}UserPoolIdentityProviderApplePrivateKey`,
            ),
            scopes: ['openid', 'profile', 'email'],
            attributeMapping: {
              email: ProviderAttribute.AMAZON_EMAIL,
              nickname: ProviderAttribute.AMAZON_NAME,
            },
          },
        )
        this.userPool.registerIdentityProvider(identityProvider)
        return identityProvider
      }
      throw new Error(
        `Could not add unsupported identity provider of type ${p.type}`,
      )
    })
    const supportedIdentityProviders = providers.map((p) => p.type)
    const callbackUrls = providers.flatMap((p) => p.callbackUrls)
    const logoutUrls = providers.flatMap((p) => p.logoutUrls)
    const userPoolWebClient = new UserPoolClient(
      this.scope,
      'UserPoolWebClient',
      {
        userPool: this.userPool,
        accessTokenValidity: Duration.hours(1),
        idTokenValidity: Duration.hours(1),
        generateSecret: false,
        supportedIdentityProviders,
        oAuth: {
          flows: {
            authorizationCodeGrant: true,
          },
          callbackUrls,
          logoutUrls,
        },
      },
    )
    identityProviders.forEach((ip) => userPoolWebClient.node.addDependency(ip))
    new CfnOutput(this.scope, `${this.id}CognitoAppClientId`, {
      value: userPoolWebClient.userPoolClientId,
      exportName: `${this.id}CognitoAppClient:Id`,
    })
    const identityPool = new IdentityPool(this.scope, 'IdentityPool', {
      allowUnauthenticatedIdentities: true,
      authenticationProviders: {
        userPools: [
          new UserPoolAuthenticationProvider({
            userPool: this.userPool,
            userPoolClient: userPoolWebClient,
          }),
        ],
      },
    })

    this.identityPool = identityPool

    new CfnOutput(this.scope, `${this.id}CognitoIdentityPoolId`, {
      value: identityPool.identityPoolId,
      exportName: `${this.id}:CognitoIdentityPool:Id`,
    })

    return {
      identityProviders,
      userPoolWebClient,
      identityPool,
    }
  }

  addPostConfirmationLambda = (
    id: string,
    props?: MiaAddPostConfirmationLambdaProps,
  ) => {
    if (!this.identityPool) {
      throw new Error(
        'Failed to add post confirmation lambda as no identity provider is added yet',
      )
    }
    const postConfirmationLambda = new NodejsFunction(
      this.scope,
      `${this.id}PostConfirmationLambda${id}`,
      {
        runtime: Runtime.NODEJS_20_X,
        timeout: Duration.seconds(5),
        architecture: Architecture.ARM_64,
        description: `Cognito post confirmation lambda for ${this.id} ${id}`,
        memorySize: 128,
        environment: {
          DATA_TABLE_NAME: this.table.tableName,
        },
        entry: path.join(__dirname, './lambda/triggers/postConfirmation.ts'),
        logRetention: RetentionDays.TWO_WEEKS,
        handler: 'handler',
        bundling: {
          externalModules: ['@aws-sdk'],
          minify: true,
        },
        ...(props?.lambda || {}),
      },
    )
    postConfirmationLambda.role!.attachInlinePolicy(
      new Policy(this.scope, `${this.id}PostConfirmationLambdaInlinePolicy`, {
        statements: [
          new PolicyStatement({
            actions: ['cognito-idp:AdminAddUserToGroup'],
            effect: Effect.ALLOW,
            sid: 'AllowCognitoGroupAdmin',
            resources: [this.identityPool.identityPoolArn],
          }),
        ],
      }),
    )
    this.table.grantReadWriteData(postConfirmationLambda)
    this.userPool.addTrigger(
      UserPoolOperation.POST_CONFIRMATION,
      postConfirmationLambda,
    )
  }
}