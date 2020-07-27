#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { SimpleBackendPipeline } from './simple-backend-pipeline';

class SimpleBackendPipelineStack extends cdk.Stack {
  constructor(parent: cdk.App, name: string, props?: cdk.StackProps) {
    super(parent, name, props);

    new SimpleBackendPipeline(this, name, {
      codeRepo:{
        repoName: process.env.CDK_CODECOMMIT_REPO as string
      },
      cfTemplate: process.env.CDK_CF_TEMPLATES as string
    });
  }
}


const app = new cdk.App();
new SimpleBackendPipelineStack(app, process.env.CDK_DEPLOY_STACKNAME as string, {
  env: {
    region: process.env.CDK_DEFAULT_REGION as string,
    account: process.env.CDK_DEFAULT_ACCOUNT as string
  }
});
app.synth();
