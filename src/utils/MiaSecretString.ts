import { SecretValue } from 'aws-cdk-lib'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from 'constructs'

export interface MiaSecretValueProps {
  unsafeRawValue?: string;
  secretArn?: string;
}

export class MiaSecretString {
  static ofUnsafeRawValue = (unsafeRawValue: string) =>
    new MiaSecretString({ unsafeRawValue })

  static ofSecretArn = (secretArn: string) =>
    new MiaSecretString({ secretArn })

  readonly unsafeRawValue?: string
  readonly secretArn?: string

  private constructor({ unsafeRawValue, secretArn }: MiaSecretValueProps) {
    this.unsafeRawValue = unsafeRawValue
    this.secretArn = secretArn
  }

  getValue = (scope: Construct, id: string): string => {
    if (!this.unsafeRawValue && !this.secretArn) {
      throw new Error('Secret value has neither unsafeRawValue nor secretArn')
    }
    if (this.unsafeRawValue) {
      return this.unsafeRawValue
    }
    return Secret.fromSecretPartialArn(
      scope,
      id,
      this.secretArn!,
    ).secretValue.unsafeUnwrap()
  }

  getSecretValue = (): SecretValue => {
    if (!this.unsafeRawValue && !this.secretArn) {
      throw new Error('Secret value has neither unsafeRawValue nor secretArn')
    }
    if (!this.unsafeRawValue) {
      return SecretValue.unsafePlainText(this.unsafeRawValue!)
    }
    return SecretValue.secretsManager(this.secretArn!)
  }
}
