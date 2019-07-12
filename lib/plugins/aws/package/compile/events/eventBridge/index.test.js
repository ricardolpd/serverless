'use strict';

/* eslint-disable no-unused-expressions */

const sinon = require('sinon');
const chai = require('chai');
const AwsProvider = require('../../../../provider/awsProvider');
const AwsCompileEventBridgeEvents = require('./index');
const Serverless = require('../../../../../../Serverless');
const customResources = require('../../../../customResources');

const { expect } = chai;
chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));

describe('AwsCompileEventBridgeEvents', () => {
  let serverless;
  let awsCompileEventBridgeEvents;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service.provider.compiledCloudFormationTemplate = { Resources: {} };
    serverless.setProvider('aws', new AwsProvider(serverless));
    awsCompileEventBridgeEvents = new AwsCompileEventBridgeEvents(serverless);
    awsCompileEventBridgeEvents.serverless.service.service = 'new-service';
  });

  describe('#constructor()', () => {
    it('should set the provider variable to an instance of AwsProvider', () =>
      expect(awsCompileEventBridgeEvents.provider).to.be.instanceof(AwsProvider));
  });

  describe('#compileEventBridgeEvents()', () => {
    let addCustomResourceToServiceStub;

    beforeEach(() => {
      addCustomResourceToServiceStub = sinon
        .stub(customResources.addCustomResourceToService, 'call')
        .resolves();
    });

    afterEach(() => {
      customResources.addCustomResourceToService.call.restore();
    });

    it('should create the necessary resources for the most minimal configuration', () => {
      awsCompileEventBridgeEvents.serverless.service.functions = {
        first: {
          name: 'first',
          events: [
            {
              eventBridge: {
                schedule: 'rate(10 minutes)',
                pattern: {
                  'source': ['aws.cloudformation'],
                  'detail-type': ['AWS API Call via CloudTrail'],
                  'detail': {
                    eventSource: ['cloudformation.amazonaws.com'],
                  },
                },
              },
            },
          ],
        },
      };

      return expect(awsCompileEventBridgeEvents.compileEventBridgeEvents()).to.be.fulfilled.then(
        () => {
          const {
            Resources,
          } = awsCompileEventBridgeEvents.serverless.service.provider.compiledCloudFormationTemplate;

          expect(addCustomResourceToServiceStub).to.have.been.calledOnce;
          expect(addCustomResourceToServiceStub.args[0][1]).to.equal('eventBridge');
          expect(Resources.FirstCustomEventBridge1).to.deep.equal({
            Type: 'Custom::EventBridge',
            Version: 1,
            DependsOn: [
              'FirstLambdaFunction',
              'CustomDashresourceDasheventDashbridgeLambdaFunction',
            ],
            Properties: {
              ServiceToken: {
                'Fn::GetAtt': ['CustomDashresourceDasheventDashbridgeLambdaFunction', 'Arn'],
              },
              FunctionName: 'first',
              EventBridgeConfig: {
                EventBus: undefined,
                Input: undefined,
                InputPath: undefined,
                InputTransformer: undefined,
                Pattern: {
                  'detail': {
                    eventSource: ['cloudformation.amazonaws.com'],
                  },
                  'detail-type': ['AWS API Call via CloudTrail'],
                  'source': ['aws.cloudformation'],
                },
                RuleName: 'first-rule-1',
                Schedule: 'rate(10 minutes)',
              },
            },
          });
        }
      );
    });
  });
});
