const autoBind = require("auto-bind");

class UploadsHandler {
  constructor(service, validator, albumsService) {
    this._service = service;
    this._validator = validator;
    this._albumsService = albumsService;

    autoBind(this);
  }

  async postUploadCoverHandler(request, h) {
    const { cover } = request.payload;
    const { id } = request.params;

    this._validator.validateCoverHeaders(cover.hapi.headers);

    const filename = await this._service.writeFile(cover, cover.hapi);
    const fileLocation = `http://${request.info.host}/uploads/file/images/${filename}`;

    await this._albumsService.editAlbumById(id, { cover: fileLocation });

    const response = h.response({
      status: "success",
      message: "Sampul berhasil diunggah",
      data: {
        fileLocation,
      },
    });
    response.code(201);
    return response;
  }
}

module.exports = UploadsHandler;
