import * as cdk from '@aws-cdk/core';
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as codebuild from "@aws-cdk/aws-codebuild";
import * as codepipelineActions from "@aws-cdk/aws-codepipeline-actions";
import * as codecommit from "@aws-cdk/aws-codecommit";
import * as s3 from "@aws-cdk/aws-s3";

export interface SimpleBackendPipelineProps extends cdk.StackProps{
  codeRepo: {
    repoName: string
  },
  cfTemplate: string
}

export class SimpleBackendPipeline extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: SimpleBackendPipelineProps) {
    super(scope, id);

    const outputSources = new codepipeline.Artifact();
    const outputBackend = new codepipeline.Artifact();
    const outputBackendCreateStack = new codepipeline.Artifact();
    const code = codecommit.Repository.fromRepositoryName(this, 'ImportedRepo', props.codeRepo.repoName);


    const pipeline = new codepipeline.Pipeline(this, 'pipeline', {
      pipelineName: `${id}-pipeline`,
      artifactBucket: s3.Bucket.fromBucketArn(this, 'ArtifactBucketByArn', `arn:aws:s3:::${props.cfTemplate}`),
      restartExecutionOnUpdate: true
    });

    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new codepipelineActions.CodeCommitSourceAction({
          actionName: 'CodeCommit_Source',
          repository: code,
          output: outputSources
        })
      ]
    });

    pipeline.addStage({
      stageName: 'Build',
      actions: [
        new codepipelineActions.CodeBuildAction({
          environmentVariables:{
            'ARTIFACT_BUCKET': {value: 'pit-pipeline-artifact-store'}
          },
          actionName: `${id}-Backend`,
          project: new codebuild.PipelineProject(this, `${id}-BuildWBackend`, {
            projectName: `${id}-Backend`,
            buildSpec: codebuild.BuildSpec.fromSourceFilename('./infra/buildspec.yml'),
          }),
          input: outputSources,
          outputs: [outputBackend],
        }),
      ],
    });
    pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new codepipelineActions.CloudFormationCreateReplaceChangeSetAction({
          actionName: `${id}-backend-action-back`,
          stackName: `${id}-app`,
          changeSetName: `${id}-app-change-set`,
          adminPermissions: true,
          output: outputBackendCreateStack,
          templatePath: outputBackend.atPath('outputtemplate.yaml'),
          runOrder: 1
        }),

        new codepipelineActions.CloudFormationExecuteChangeSetAction({
          actionName: `${id}-backend-execution-back`,
          stackName: `${id}-app`,
          changeSetName: `${id}-app-change-set`,
          runOrder: 2,
        })
      ],
    });

  }
}
