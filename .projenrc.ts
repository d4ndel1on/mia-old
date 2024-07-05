import { awscdk } from 'projen';
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'd4ndel1on',
  authorName: 'Stefan',
  authorAddress: 'stefan@fancynetwork.net',
  cdkVersion: '2.147.3',
  defaultReleaseBranch: 'main',
  jsiiVersion: '~5.4.0',
  name: 'mia',
  projenrcTs: true,
  repositoryUrl: 'https://github.com/d4ndel1on/mia.git',
  license: 'MIT',
  keywords: ['cognito', 'lambda', 'api-gateway', 'dynamodb'],
  description: 'Construct to integrate user management into a project',
  packageName: '@d4ndel1on/mia',
});
project.synth();