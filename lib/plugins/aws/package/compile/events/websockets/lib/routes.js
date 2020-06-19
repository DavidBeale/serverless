'use strict';

const _ = require('lodash');
const BbPromise = require('bluebird');

module.exports = {
  compileRoutes() {
    this.validated.events.forEach(event => {
      const websocketsIntegrationLogicalId = this.provider.naming.getWebsocketsIntegrationLogicalId(
        event.functionName
      );

      const websocketsRouteLogicalId = this.provider.naming.getWebsocketsRouteLogicalId(
        event.route
      );

      const routeTemplate = {
        [websocketsRouteLogicalId]: {
          Type: 'AWS::ApiGatewayV2::Route',
          Properties: {
            ApiId: this.provider.getApiGatewayWebsocketApiId(),
            RouteKey: event.route,
            AuthorizationType: 'NONE',
            Target: {
              'Fn::Join': ['/', ['integrations', { Ref: websocketsIntegrationLogicalId }]],
            },
          },
        },
      };

      if (event.routeResponseSelectionExpression) {
        routeTemplate[websocketsRouteLogicalId].Properties.RouteResponseSelectionExpression =
          event.routeResponseSelectionExpression;
      }

      if (event.authorizer) {
        routeTemplate[websocketsRouteLogicalId].Properties.AuthorizationType = 'CUSTOM';
        routeTemplate[websocketsRouteLogicalId].Properties.AuthorizerId = {
          Ref: this.provider.naming.getWebsocketsAuthorizerLogicalId(event.authorizer.name),
        };
      }

      if (event.request && event.request.schema) {
        const websocketsRouteModelLogicalId = this.provider.naming.getWebsocketsRouteModelLogicalId(
          event.route
        );
        const contentType = Object.keys(event.request.schema)[0];

        routeTemplate[websocketsRouteLogicalId].Properties.ModelSelectionExpression =
          event.routeResponseSelectionExpression || '$request.body.action';
        routeTemplate[websocketsRouteLogicalId].Properties.RequestModels = {
          [event.route]: websocketsRouteModelLogicalId,
        };

        routeTemplate[websocketsRouteModelLogicalId] = {
          Type: 'AWS::ApiGatewayV2::Model',
          Properties: {
            Name: websocketsRouteModelLogicalId,
            ApiId: this.provider.getApiGatewayWebsocketApiId(),
            ContentType: contentType,
            Schema: event.request.schema[contentType],
          },
        };
      }

      _.merge(
        this.serverless.service.provider.compiledCloudFormationTemplate.Resources,
        routeTemplate
      );
    });

    return BbPromise.resolve();
  },
};
