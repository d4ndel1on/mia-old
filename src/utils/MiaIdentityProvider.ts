import { UserPoolClientIdentityProvider } from 'aws-cdk-lib/aws-cognito'
import { MiaSecretString } from './MiaSecretString'

export interface MiaIdentityProviderProps {
  type: UserPoolClientIdentityProvider;
  clientId: MiaSecretString;
  callbackUrls: string[];
  logoutUrls: string[];
}

export abstract class MiaIdentityProvider {
  static google = (props: Omit<MiaIdentityProviderGoogleProps, 'type'>) =>
    MiaIdentityProviderGoogle.of({ ...props, type: UserPoolClientIdentityProvider.GOOGLE })
  static apple = (props: Omit<MiaIdentityProviderAppleProps, 'type'>) =>
    MiaIdentityProviderApple.of({ ...props, type: UserPoolClientIdentityProvider.APPLE })

  readonly type: UserPoolClientIdentityProvider
  readonly clientId: MiaSecretString
  readonly callbackUrls: string[]
  readonly logoutUrls: string[]

  protected constructor({
    type,
    clientId,
    callbackUrls,
    logoutUrls,
  }: MiaIdentityProviderProps) {
    this.type = type
    this.clientId = clientId
    this.callbackUrls = callbackUrls
    this.logoutUrls = logoutUrls
  }
}

export interface MiaIdentityProviderGoogleProps extends MiaIdentityProviderProps {
  clientId: MiaSecretString;
  clientSecret: MiaSecretString;
}

export class MiaIdentityProviderGoogle extends MiaIdentityProvider {
  static of = (props: MiaIdentityProviderGoogleProps) =>
    new MiaIdentityProviderGoogle(props)

  readonly clientSecret: MiaSecretString

  private constructor(props: MiaIdentityProviderGoogleProps) {
    super(props)
    this.clientSecret = props.clientSecret
  }
}

export interface MiaIdentityProviderAppleProps extends MiaIdentityProviderProps {
  teamId: MiaSecretString;
  keyId: MiaSecretString;
  privateKey: MiaSecretString;
}

export class MiaIdentityProviderApple extends MiaIdentityProvider {
  static of = (props: MiaIdentityProviderAppleProps) =>
    new MiaIdentityProviderApple(props)

  readonly teamId: MiaSecretString
  readonly keyId: MiaSecretString
  readonly privateKey: MiaSecretString

  private constructor(props: MiaIdentityProviderAppleProps) {
    super(props)
    this.teamId = props.teamId
    this.keyId = props.keyId
    this.privateKey = props.privateKey
  }
}
