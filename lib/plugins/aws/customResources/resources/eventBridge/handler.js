'use strict';

const { addPermission, removePermission } = require('./lib/permissions');
const {
  updateRuleConfiguration,
  updateTargetConfiguration,
  removeRuleConfiguration,
  removeTargetConfiguration,
} = require('./lib/eventBridge');
const { getEnvironment, getLambdaArn, handlerWrapper } = require('../utils');

function handler(event, context) {
  if (event.RequestType === 'Create') {
    return create(event, context);
  } else if (event.RequestType === 'Update') {
    return update(event, context);
  } else if (event.RequestType === 'Delete') {
    return remove(event, context);
  }
  throw new Error(`Unhandled RequestType ${event.RequestType}`);
}

function create(event, context) {
  const { FunctionName, EventBridgeConfig } = event.ResourceProperties;
  const { Region, AccountId } = getEnvironment(context);

  const lambdaArn = getLambdaArn(Region, AccountId, FunctionName);

  return addPermission({
    functionName: FunctionName,
    region: Region,
    accountId: AccountId,
    ruleName: EventBridgeConfig.RuleName,
  })
    .then(() =>
      updateRuleConfiguration({
        region: Region,
        ruleName: EventBridgeConfig.RuleName,
        eventBusName: EventBridgeConfig.EventBus,
        pattern: EventBridgeConfig.Pattern,
        schedule: EventBridgeConfig.Schedule,
      })
    )
    .then(() =>
      updateTargetConfiguration({
        lambdaArn,
        region: Region,
        functionName: FunctionName,
        ruleName: EventBridgeConfig.RuleName,
        eventBusName: EventBridgeConfig.EventBus,
        input: EventBridgeConfig.Input,
        inputPath: EventBridgeConfig.InputPath,
        inputTransformer: EventBridgeConfig.InputTransformer,
      })
    );
}

function update(event, context) {
  const { Region, AccountId } = getEnvironment(context);
  const { FunctionName, EventBridgeConfig } = event.ResourceProperties;

  const lambdaArn = getLambdaArn(Region, AccountId, FunctionName);

  return updateRuleConfiguration({
    region: Region,
    ruleName: EventBridgeConfig.RuleName,
    eventBusName: EventBridgeConfig.EventBus,
    pattern: EventBridgeConfig.Pattern,
    schedule: EventBridgeConfig.Schedule,
  }).then(() =>
    updateTargetConfiguration({
      lambdaArn,
      region: Region,
      functionName: FunctionName,
      ruleName: EventBridgeConfig.RuleName,
      eventBusName: EventBridgeConfig.EventBus,
      input: EventBridgeConfig.Input,
      inputPath: EventBridgeConfig.InputPath,
      inputTransformer: EventBridgeConfig.InputTransformer,
    })
  );
}

function remove(event, context) {
  const { Region } = getEnvironment(context);
  const { FunctionName, EventBridgeConfig } = event.ResourceProperties;

  return removePermission({
    functionName: FunctionName,
    region: Region,
    ruleName: EventBridgeConfig.RuleName,
  })
    .then(() =>
      removeTargetConfiguration({
        functionName: FunctionName,
        ruleName: EventBridgeConfig.RuleName,
        eventBusName: EventBridgeConfig.EventBus,
        region: Region,
      })
    )
    .then(() =>
      removeRuleConfiguration({
        ruleName: EventBridgeConfig.RuleName,
        eventBusName: EventBridgeConfig.EventBus,
        region: Region,
      })
    );
}

module.exports = {
  // handler: handlerWrapper(handler, 'CustomResouceEventBridge'),
  handler,
};
