'use strict';

const expect = require('chai').expect;
const AwsCompileWebsocketsEvents = require('../index');
const Serverless = require('../../../../../../../Serverless');
const AwsProvider = require('../../../../../provider/awsProvider');

describe('#compileRoutes()', () => {
  let awsCompileWebsocketsEvents;

  beforeEach(() => {
    const serverless = new Serverless();
    serverless.setProvider('aws', new AwsProvider(serverless));
    serverless.service.provider.compiledCloudFormationTemplate = { Resources: {} };

    awsCompileWebsocketsEvents = new AwsCompileWebsocketsEvents(serverless);

    awsCompileWebsocketsEvents.websocketsApiLogicalId = awsCompileWebsocketsEvents.provider.naming.getWebsocketsApiLogicalId();
  });

  it('should create a route resource for every event', () => {
    awsCompileWebsocketsEvents.validated = {
      events: [
        {
          functionName: 'First',
          route: '$connect',
        },
        {
          functionName: 'Second',
          route: '$disconnect',
        },
      ],
    };

    return awsCompileWebsocketsEvents.compileRoutes().then(() => {
      const resources =
        awsCompileWebsocketsEvents.serverless.service.provider.compiledCloudFormationTemplate
          .Resources;

      expect(resources).to.deep.equal({
        SconnectWebsocketsRoute: {
          Type: 'AWS::ApiGatewayV2::Route',
          Properties: {
            ApiId: {
              Ref: 'WebsocketsApi',
            },
            RouteKey: '$connect',
            AuthorizationType: 'NONE',
            Target: {
              'Fn::Join': [
                '/',
                [
                  'integrations',
                  {
                    Ref: 'FirstWebsocketsIntegration',
                  },
                ],
              ],
            },
          },
        },
        SdisconnectWebsocketsRoute: {
          Type: 'AWS::ApiGatewayV2::Route',
          Properties: {
            ApiId: {
              Ref: 'WebsocketsApi',
            },
            RouteKey: '$disconnect',
            AuthorizationType: 'NONE',
            Target: {
              'Fn::Join': [
                '/',
                [
                  'integrations',
                  {
                    Ref: 'SecondWebsocketsIntegration',
                  },
                ],
              ],
            },
          },
        },
      });
    });
  });

  it('should set routeResponseSelectionExpression when configured', () => {
    awsCompileWebsocketsEvents.validated = {
      events: [
        {
          functionName: 'First',
          route: '$connect',
          routeResponseSelectionExpression: '$default',
        },
      ],
    };

    return awsCompileWebsocketsEvents.compileRoutes().then(() => {
      const resources =
        awsCompileWebsocketsEvents.serverless.service.provider.compiledCloudFormationTemplate
          .Resources;

      expect(resources).to.deep.equal({
        SconnectWebsocketsRoute: {
          Type: 'AWS::ApiGatewayV2::Route',
          Properties: {
            ApiId: {
              Ref: 'WebsocketsApi',
            },
            RouteKey: '$connect',
            AuthorizationType: 'NONE',
            RouteResponseSelectionExpression: '$default',
            Target: {
              'Fn::Join': [
                '/',
                [
                  'integrations',
                  {
                    Ref: 'FirstWebsocketsIntegration',
                  },
                ],
              ],
            },
          },
        },
      });
    });
  });

  it('should set authorizer property for the connect route', () => {
    awsCompileWebsocketsEvents.validated = {
      events: [
        {
          functionName: 'First',
          route: '$connect',
          authorizer: {
            name: 'auth',
          },
        },
      ],
    };

    return awsCompileWebsocketsEvents.compileRoutes().then(() => {
      const resources =
        awsCompileWebsocketsEvents.serverless.service.provider.compiledCloudFormationTemplate
          .Resources;

      expect(resources).to.deep.equal({
        SconnectWebsocketsRoute: {
          Type: 'AWS::ApiGatewayV2::Route',
          Properties: {
            ApiId: {
              Ref: 'WebsocketsApi',
            },
            RouteKey: '$connect',
            AuthorizationType: 'CUSTOM',
            AuthorizerId: {
              Ref: awsCompileWebsocketsEvents.provider.naming.getWebsocketsAuthorizerLogicalId(
                'auth'
              ),
            },
            Target: {
              'Fn::Join': [
                '/',
                [
                  'integrations',
                  {
                    Ref: 'FirstWebsocketsIntegration',
                  },
                ],
              ],
            },
          },
        },
      });
    });
  });

  it('should define and reference a request model when configured', () => {
    awsCompileWebsocketsEvents.validated = {
      events: [
        {
          functionName: 'First',
          route: 'message',
          request: {
            schema: {
              'application/json': {
                $schema: 'http://json-schema.org/draft-04/schema#',
                type: 'string',
              },
            },
          },
        },
      ],
    };

    return awsCompileWebsocketsEvents.compileRoutes().then(() => {
      const resources =
        awsCompileWebsocketsEvents.serverless.service.provider.compiledCloudFormationTemplate
          .Resources;

      expect(resources).to.deep.equal({
        messageWebsocketsRoute: {
          Type: 'AWS::ApiGatewayV2::Route',
          Properties: {
            ApiId: {
              Ref: 'WebsocketsApi',
            },
            RouteKey: 'message',
            AuthorizationType: 'NONE',
            Target: {
              'Fn::Join': [
                '/',
                [
                  'integrations',
                  {
                    Ref: 'FirstWebsocketsIntegration',
                  },
                ],
              ],
            },
            ModelSelectionExpression: '$request.body.action',
            RequestModels: {
              message: 'messageWebsocketsRouteModel',
            },
          },
        },
        messageWebsocketsRouteModel: {
          Type: 'AWS::ApiGatewayV2::Model',
          Properties: {
            Name: 'messageWebsocketsRouteModel',
            ApiId: {
              Ref: 'WebsocketsApi',
            },
            ContentType: 'application/json',
            Schema: {
              $schema: 'http://json-schema.org/draft-04/schema#',
              type: 'string',
            },
          },
        },
      });
    });
  });
});
