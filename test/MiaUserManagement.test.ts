import { describe } from 'node:test'
import { App } from 'aws-cdk-lib'
import { Template } from 'aws-cdk-lib/assertions'
import { HostedZone } from 'aws-cdk-lib/aws-route53'
import { MiaCertificateStack } from '../src/MiaCertificateStack'
import { MiaStack } from '../src/MiaStack'
import { MiaIdentityProvider } from '../src/utils/MiaIdentityProvider'
import { MiaSecretString } from '../src/utils/MiaSecretString'

void describe('MiaUserManagement', async () => {
  const hostedZoneLookup = jest.spyOn(HostedZone, 'fromLookup')

  beforeEach(() => {
    hostedZoneLookup.mockImplementation((scope, id, props) => new HostedZone(scope, id, {
      zoneName: props.domainName,
    }))
  })
  afterEach(() => hostedZoneLookup.mockRestore())

  test('default', () => {
    const app = new App()
    const certificateStack = new MiaCertificateStack(app, 'CertificateStack', {
      domain: 'h0pe.example',
      cnames: ['auth'],
      env: {
        region: 'us-east-1',
      },
      crossRegionReferences: true,
    })
    const miaStack = new MiaStack(app, 'MiaStack', {
      crossRegionReferences: true,
      env: {
        region: 'eu-west-1',
      },
    })
    const { userManagement } = miaStack
    userManagement.addUserGroup('MyDefaultUserGroup', { groupName: 'default' })
    userManagement.addUserGroup('MyAdminUserGroup', { groupName: 'admin' })
    userManagement.addCustomDomain('MyCustomDomain', {
      cname: 'auth',
      domainName: certificateStack.zone.zoneName,
      certificateArn: certificateStack.certificate.certificateArn,
      hostedZoneId: certificateStack.zone.hostedZoneId,
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
    const template = Template.fromStack(miaStack)
    expect(template.toJSON()).toMatchSnapshot()
  })
})
