const { nanoid } = require("nanoid");
const { Pool } = require("pg");
const InvariantError = require("../../exceptions/InvariantError");
const NotFoundError = require("../../exceptions/NotFoundError");

class CollaborationsService {
  constructor() {
    this._pool = new Pool();
  }

  async addCollaboration(playlistId, userId) {
    const playlistQuery = {
      text: "SELECT id FROM playlists WHERE id = $1",
      values: [playlistId],
    };
    const playlistResult = await this._pool.query(playlistQuery);
    if (!playlistResult.rows.length) {
      throw new NotFoundError("Playlist tidak ditemukan");
    }

    const userQuery = {
      text: "SELECT id FROM users WHERE id = $1",
      values: [userId],
    };
    const userResult = await this._pool.query(userQuery);
    if (!userResult.rows.length) {
      throw new NotFoundError("User tidak ditemukan");
    }

    const checkQuery = {
      text: "SELECT id FROM collaborations WHERE playlist_id = $1 AND user_id = $2",
      values: [playlistId, userId],
    };
    const checkResult = await this._pool.query(checkQuery);
    if (checkResult.rows.length) {
      throw new InvariantError("Kolaborasi sudah ada");
    }

    const id = `collab-${nanoid(16)}`;
    const query = {
      text: "INSERT INTO collaborations VALUES($1, $2, $3) RETURNING id",
      values: [id, playlistId, userId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new InvariantError("Kolaborasi gagal ditambahkan");
    }

    return result.rows[0].id;
  }

  async deleteCollaboration(playlistId, userId) {
    const checkQuery = {
      text: "SELECT id FROM collaborations WHERE playlist_id = $1 AND user_id = $2",
      values: [playlistId, userId],
    };
    const checkResult = await this._pool.query(checkQuery);
    if (!checkResult.rows.length) {
      throw new NotFoundError("Kolaborasi tidak ditemukan");
    }

    const query = {
      text: "DELETE FROM collaborations WHERE playlist_id = $1 AND user_id = $2 RETURNING id",
      values: [playlistId, userId],
    };
    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new InvariantError("Kolaborasi gagal dihapus");
    }
  }
}

module.exports = CollaborationsService;
