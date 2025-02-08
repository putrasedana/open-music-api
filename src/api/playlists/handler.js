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

    const { id: owner } = request.auth.credentials;

    const playlistId = await this._service.addPlaylist(name, owner);

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
    this._validator.validateSongToPlaylist(request.payload);

    const { id: playlistId } = request.params;
    const { songId } = request.payload;
    const { id: userId } = request.auth.credentials;

    await this._service.verifyPlaylistAccess(playlistId, userId);

    await this._service.addSongToPlaylist(playlistId, songId, userId);

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
    const { id: userId } = request.auth.credentials;

    await this._service.verifyPlaylistAccess(playlistId, userId);

    await this._service.deleteSongFromPlaylist(playlistId, songId, userId);

    return h
      .response({
        status: "success",
        message: "Lagu berhasil dihapus dari playlist",
      })
      .code(200);
  }

  async getPlaylistActivitiesHandler(request, h) {
    const { id: playlistId } = request.params;
    const { id: userId } = request.auth.credentials;

    await this._service.verifyPlaylistAccess(playlistId, userId);

    const activities = await this._service.getPlaylistActivities(playlistId);

    return h
      .response({
        status: "success",
        data: {
          playlistId,
          activities,
        },
      })
      .code(200);
  }
}

module.exports = PlaylistsHandler;
