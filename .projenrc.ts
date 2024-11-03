import { awscdk } from 'projen'
import { NpmAccess } from 'projen/lib/javascript'

const project = new awscdk.AwsCdkConstructLibrary({
  author: 'd4ndel1on',
  authorName: 'Stefan',
  authorAddress: 'stefan@fancynetwork.net',
  cdkVersion: '2.149.0',
  defaultReleaseBranch: 'main',
  jsiiVersion: '~5.4.0',
  name: 'mia',
  projenrcTs: true,
  typescriptVersion: 'latest',
  repositoryUrl: 'https://github.com/d4ndel1on/mia.git',
  license: 'MIT',
  keywords: ['cognito', 'lambda', 'api-gateway', 'dynamodb'],
  description: 'AWS CDK construct to integrate user management into a project',
  packageName: '@h0pe/mia',
  npmAccess: NpmAccess.PUBLIC,
  bundledDeps: [
    '@aws-lambda-powertools/logger',
    '@aws-sdk/client-cognito-identity-provider',
    '@aws-sdk/util-dynamodb',
    '@aws-sdk/client-dynamodb',
    'aws-lambda',
    'esbuild',
  ],
  devDeps: [
    '@types/aws-lambda',
    'esbuild',
  ],
  deps: [
    '@aws-cdk/aws-cognito-identitypool-alpha',
    'aws-lambda',
    '@aws-lambda-powertools/logger',
    '@aws-sdk/util-dynamodb',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/client-cognito-identity-provider',
  ],
  depsUpgradeOptions: {
    workflow: false,
  },
})
project.eslint?.addRules({
  '@typescript-eslint/no-floating-promises': 'error',
  'semi': ['error', 'never'],
  'comma-dangle': ['error', 'always-multiline'],
})
project.synth()
