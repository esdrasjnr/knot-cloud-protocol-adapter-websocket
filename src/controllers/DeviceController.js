class DeviceController {
  constructor(registerInteractor, updateMetadataInteractor, devicesInteractor, logger) {
    this.registerInteractor = registerInteractor;
    this.updateMetadataInteractor = updateMetadataInteractor;
    this.devicesInteractor = devicesInteractor;
    this.logger = logger;
  }

  async register(request, responseHandler) {
    try {
      const response = await this.registerInteractor.execute(request.id, request.data);
      this.logger.info('Device registered');
      await responseHandler.send(response.type, response.data);
    } catch (error) {
      this.logger.error(`Failed registering device (${error.code || 500}): ${error.message}`);
      await responseHandler.send('error', {
        code: error.code || 500,
        message: error.message,
      });
    }
  }

  async updateMetadata(request, responseHandler) {
    try {
      const response = await this.updateMetadataInteractor.execute(request.id, request.data);
      this.logger.info('Device metadata updated');
      await responseHandler.send(response.type, response.data);
    } catch (error) {
      this.logger.error(`Failed updating device metadata (${error.code || 500}): ${error.message}`);
      await responseHandler.send('error', {
        code: error.code || 500,
        message: error.message,
      });
    }
  }

  async list(request, responseHandler) {
    try {
      const response = await this.devicesInteractor.execute(request.id, request.data.query);
      this.logger.info('Devices obtained');
      await responseHandler.send(response.type, response.data);
    } catch (error) {
      this.logger.error(`Failed to get devices (${error.code || 500}): ${error.message}`);
      await responseHandler.send('error', {
        code: error.code || 500,
        message: error.message,
      });
    }
  }
}

export default DeviceController;