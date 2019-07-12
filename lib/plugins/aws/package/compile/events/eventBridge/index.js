'use strict';

const _ = require('lodash');
const { addCustomResourceToService } = require('../../../../customResources');

class AwsCompileEventBridgeEvents {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('aws');

    this.hooks = {
      'package:compileEvents': this.compileEventBridgeEvents.bind(this),
    };
  }

  compileEventBridgeEvents() {
    const { service } = this.serverless;
    const { provider } = service;
    const { compiledCloudFormationTemplate } = provider;
    const iamRoleStatements = [];

    service.getAllFunctions().forEach(functionName => {
      const functionObj = service.getFunction(functionName);
      const FunctionName = functionObj.name;

      if (functionObj.events) {
        functionObj.events.forEach((event, idx) => {
          if (typeof event.eventBridge === 'object') {
            idx++;

            const EventBus = event.eventBridge.eventBus;
            const Schedule = event.eventBridge.schedule;
            const Pattern = event.eventBridge.pattern;
            const Input = event.eventBridge.input;
            const InputPath = event.eventBridge.inputPath;
            const InputTransformer = event.eventBridge.inputTransformer;
            const RuleName = `${FunctionName}-rule-${idx}`;

            // TODO: check if more than one `input` type is provided

            const eventFunctionLogicalId = this.provider.naming.getLambdaLogicalId(functionName);
            const customResourceFunctionLogicalId = this.provider.naming.getCustomResourceEventBridgeHandlerFunctionLogicalId();
            const customEventBridgeResourceLogicalId = this.provider.naming.getCustomResourceEventBridgeResourceLogicalId(
              functionName,
              idx
            );

            const customEventBridge = {
              [customEventBridgeResourceLogicalId]: {
                Type: 'Custom::EventBridge',
                Version: 1.0,
                DependsOn: [eventFunctionLogicalId, customResourceFunctionLogicalId],
                Properties: {
                  ServiceToken: {
                    'Fn::GetAtt': [customResourceFunctionLogicalId, 'Arn'],
                  },
                  FunctionName,
                  EventBridgeConfig: {
                    RuleName,
                    EventBus,
                    Schedule,
                    Pattern,
                    Input,
                    InputPath,
                    InputTransformer,
                  },
                },
              },
            };

            _.merge(compiledCloudFormationTemplate.Resources, customEventBridge);

            // iamRoleStatements.push({
            //   Effect: 'Allow',
            //   Resource: '*',
            //   Action: [
            //     'cognito-idp:ListUserPools',
            //     'cognito-idp:DescribeUserPool',
            //     'cognito-idp:UpdateUserPool',
            //   ],
            // });
          }
        });
      }

      iamRoleStatements.push({
        Effect: 'Allow',
        Resource: `arn:aws:lambda:*:*:function:${FunctionName}`,
        Action: ['lambda:AddPermission', 'lambda:RemovePermission'],
      });
    });

    if (iamRoleStatements.length) {
      return addCustomResourceToService.call(this, 'eventBridge', iamRoleStatements);
    }

    return null;
  }
}

module.exports = AwsCompileEventBridgeEvents;
