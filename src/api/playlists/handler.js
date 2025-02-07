const autoBind = require("auto-bind");

class PlaylistsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    autoBind(this);
  }

  async postPlaylistHandler(request, h) {
    this._validator.validatePlaylistPayload(request.payload);

    const { name } = request.payload;
    console.log("Received name:", name);

    const { id: owner } = request.auth.credentials;

    const playlistId = await this._service.addPlaylist({ name }, owner);

    return h
      .response({
        status: "success",
        message: "Playlist berhasil ditambahkan",
        data: { playlistId },
      })
      .code(201);
  }

  async getPlaylistsHandler(request, h) {
    const { id: owner } = request.auth.credentials;
    const playlists = await this._service.getPlaylists(owner);

    return h
      .response({
        status: "success",
        data: { playlists },
      })
      .code(200);
  }

  async deletePlaylistHandler(request, h) {
    const { id } = request.params;
    const { id: owner } = request.auth.credentials;

    await this._service.deletePlaylistById(id, owner);

    return h
      .response({
        status: "success",
        message: "Playlist berhasil dihapus",
      })
      .code(200);
  }

  async postSongToPlaylistHandler(request, h) {
    console.debug(request.payload);
    this._validator.validateSongToPlaylist(request.payload);

    const { id: playlistId } = request.params;
    const { songId } = request.payload;
    const { id: owner } = request.auth.credentials;

    await this._service.verifyPlaylistOwner(playlistId, owner);

    await this._service.addSongToPlaylist(playlistId, songId);

    return h
      .response({
        status: "success",
        message: "Lagu berhasil ditambahkan ke playlist",
      })
      .code(201);
  }

  async getPlaylistSongsHandler(request, h) {
    const { id: playlistId } = request.params;
    const { id: owner } = request.auth.credentials;

    await this._service.verifyPlaylistAccess(playlistId, owner);

    const playlist = await this._service.getPlaylistSongs(playlistId);

    return h
      .response({
        status: "success",
        data: { playlist },
      })
      .code(200);
  }

  async deleteSongFromPlaylistHandler(request, h) {
    this._validator.validateSongToPlaylist(request.payload);

    const { id: playlistId } = request.params;
    const { songId } = request.payload;
    const { id: ownerId } = request.auth.credentials;

    await this._service.deleteSongFromPlaylist(playlistId, songId, ownerId);

    return h
      .response({
        status: "success",
        message: "Lagu berhasil dihapus dari playlist",
      })
      .code(200);
  }
}

module.exports = PlaylistsHandler;
