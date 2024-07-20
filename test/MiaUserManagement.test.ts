import { describe } from 'node:test'
import { App, Stack } from 'aws-cdk-lib'
import { Template } from 'aws-cdk-lib/assertions'
import { MiaUserManagement } from '../src/MiaUserManagement'
import { MiaIdentityProvider } from '../src/utils/MiaIdentityProvider'
import { MiaSecretString } from '../src/utils/MiaSecretString'

void describe('MiaUserManagement', async () => {
  test('default', () => {
    const app = new App()
    const stack = new Stack(app, 'TestStack')
    const userManagement = new MiaUserManagement(stack, 'MiaUserManagement', {
      dynamoDbTableName: 'tableName',
    })
    userManagement.addUserGroup('MyDefaultUserGroup', { groupName: 'default' })
    userManagement.addUserGroup('MyAdminUserGroup', { groupName: 'admin' })
    userManagement.addCustomDomain('MyCustomDomain', {
      cname: 'auth',
      certificateArn: 'arn:certificate:1',
      domainName: 'mia.h0pe.example',
      hostedZoneId: 'my-hosted-zone-id',
    })
    userManagement.addIdentityProviders({
      providers: [
        MiaIdentityProvider.google({
          clientId: MiaSecretString.ofUnsafeRawValue('my-google-client-id'),
          clientSecret: MiaSecretString.ofSecretArn('arn:my-secret'),
          logoutUrls: ['http://logout.google.example'],
          callbackUrls: ['https://callback.google.example'],
        }),
        MiaIdentityProvider.apple({
          clientId: MiaSecretString.ofUnsafeRawValue('my-apple-client-id'),
          keyId: MiaSecretString.ofSecretArn('arn:secret:test:apple:my:secret:keyId'),
          teamId: MiaSecretString.ofUnsafeRawValue('secret-team-id'),
          privateKey: MiaSecretString.ofSecretArn('arn:secret:test:apple:my:secret:privateKey'),
          logoutUrls: ['http://logout.apple.example'],
          callbackUrls: ['https://callback.apple.example'],
        }),
      ],
    })
    userManagement.addPostConfirmationLambda('MyPostConfirmationLambda')
    const template = Template.fromStack(stack)
    expect(template.toJSON()).toMatchSnapshot()
  })
})
