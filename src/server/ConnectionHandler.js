import _ from 'lodash';

class ConnectionHandler {
  constructor(id, authenticationController, deviceController, client, cloud, logger) {
    this.id = id;
    this.authenticationController = authenticationController;
    this.deviceController = deviceController;
    this.client = client;
    this.cloud = cloud;
    this.logger = logger;
    this.handlers = {
      identity: this.createHandler(this.authenticationController.authenticate
        .bind(this.authenticationController)),
      register: this.createHandler(this.deviceController.register
        .bind(this.deviceController)),
      metadata: this.createHandler(this.deviceController.updateMetadata
        .bind(this.deviceController)),
      devices: this.createHandler(this.deviceController.list
        .bind(this.deviceController)),
      unregister: this.createHandler(this.deviceController.unregister
        .bind(this.deviceController)),
      schema: this.createHandler(this.deviceController.updateSchema
        .bind(this.deviceController)),
      token: this.createHandler(this.deviceController.createSessionToken
        .bind(this.deviceController)),
      revoke: this.createHandler(this.deviceController.revokeSessionToken
        .bind(this.deviceController)),
      activate: this.createHandler(this.deviceController.activateDevice
        .bind(this.deviceController)),
      data: this.createHandler(this.deviceController.publishData
        .bind(this.deviceController)),
      getData: this.createHandler(this.deviceController.getData
        .bind(this.deviceController)),
      setData: this.createHandler(this.deviceController.setData
        .bind(this.deviceController)),
    };
  }

  async start() {
    this.cloud.on('message', this.onCloudMessage.bind(this));
    this.client.on('message', this.onClientMessage.bind(this));
    this.client.on('close', this.onClientClose.bind(this));
    this.client.on('error', this.onClientError.bind(this));
    this.logger.info('Connected');
  }

  async onClientMessage(event) {
    try {
      const handler = this.getHandler(event.type);
      this.logger.info(`Handling '${event.type}'`);
      await handler(event.data);
    } catch (error) {
      this.logger.error(`Failed processing client message: ${error.message}`);
      this.logger.debug('Event:', event);
    }
  }

  getHandler(type) {
    if (!this.handlers[type]) {
      throw new Error(`Unknown event type '${type}'`);
    }
    return this.handlers[type];
  }

  onClientClose(code, reason) {
    this.logger.info('Disconnected');
    this.logger.debug(`Disconnect code: ${code}`);
    this.logger.debug(`Disconnect reason: ${reason}`);
    this.cloud.close();
  }

  onClientError(error) {
    this.logger.error(error.message);
  }

  onCloudMessage(message) {
    const event = this.cloudMessageToEvent(message);
    this.logger.info(`Forwarding '${event.type}' sent by '${event.data.from}'`);
    this.client.send(event.type, event.data);
  }

  createHandler(controllerMethod) {
    return async data => controllerMethod({ id: this.id, data }, this.client);
  }

  cloudMessageToEvent(message) {
    const types = ['broadcast.sent', 'unregister.sent', 'message.received'];
    const routeData = _.chain(message.metadata.route)
      .filter(data => _.includes(types, data.type))
      .head()
      .value();

    const event = {
      data: {
        from: routeData.from,
      },
    };

    if (routeData.type === 'unregister.sent') {
      event.type = 'unregistered';
      // As the device was already unregistered, reverse lookup returned nothing.
      // We can still recover the KNoT ID from the message.
      event.data.from = message.data.knot.id;
    } else {
      event.type = message.data.topic;
      event.data.payload = message.data.payload;
    }

    return event;
  }
}

export default ConnectionHandler;
