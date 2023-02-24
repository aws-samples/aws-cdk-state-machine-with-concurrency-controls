const { execSync } = require('child_process');
const { typescript } = require('projen');
const { NodePackageManager } = require('projen/lib/javascript');
const project = new typescript.TypeScriptProject({
  author: 'Galen Dunkleberger',
  authorAddress: 'awsgalen@amazon.com',
  cdkVersion: `${execSync("npm show 'aws-cdk-lib' version")}`.trim(),
  defaultReleaseBranch: 'main',
  name: 'aws-cdk-state-machine-with-concurrency-controls',
  repositoryUrl: 'git@github.com:aws-samples/aws-cdk-state-machine-with-concurrency-controls.git',
  packageManager: NodePackageManager.NPM,
  deps: ['aws-cdk-lib', 'constructs', '@aws-sdk/client-dynamodb', '@aws-sdk/client-sfn', '@aws-sdk/client-sqs', '@types/aws-lambda'], /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  devDeps: ['jest'], /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.eslint.rules['space-before-blocks'] = 'error'; // require space before blocks
project.eslint.rules.curly = ['error', 'multi-line', 'consistent']; // require curly for multiline
project.eslint.rules['max-len'] = ['error', { code: 200, ignoreComments: true }];
project.eslint.rules['no-var'] = ['error'];
project.synth();