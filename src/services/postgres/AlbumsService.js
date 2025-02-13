const { nanoid } = require("nanoid");
const { Pool } = require("pg");
const InvariantError = require("../../exceptions/InvariantError");
const NotFoundError = require("../../exceptions/NotFoundError");
const config = require("../../utils/config");

class AlbumsService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addAlbum({ name, year }) {
    const id = `album-${nanoid(16)}`;

    const query = {
      text: "INSERT INTO albums VALUES($1, $2, $3) RETURNING id",
      values: [id, name, year],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError("Album gagal ditambahkan");
    }

    return result.rows[0].id;
  }

  async getAlbumById(id) {
    const albumQuery = {
      text: "SELECT * FROM albums WHERE id = $1",
      values: [id],
    };

    const albumResult = await this._pool.query(albumQuery);

    if (!albumResult.rows.length) {
      throw new NotFoundError("Album tidak ditemukan");
    }

    const album = albumResult.rows[0];

    const songsQuery = {
      text: "SELECT id, title, performer FROM songs WHERE album_id = $1",
      values: [id],
    };
    const songsResult = await this._pool.query(songsQuery);

    return {
      id: album.id,
      name: album.name,
      year: album.year,
      coverUrl: album.cover,
      songs: songsResult.rows,
    };
  }

  async editAlbumById(id, { name, year, cover }) {
    const query = {
      text: "UPDATE albums SET name = COALESCE($1, name), year = COALESCE($2, year), cover = COALESCE($3, cover) WHERE id = $4 RETURNING id",
      values: [name, year, cover, id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Gagal memperbarui album. Id tidak ditemukan");
    }
  }

  async deleteAlbumById(id) {
    const query = {
      text: "DELETE FROM albums WHERE id = $1 RETURNING id",
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Album gagal dihapus. Id tidak ditemukan");
    }
  }

  async likeAlbum(userId, albumId) {
    const albumCheckQuery = {
      text: "SELECT id FROM albums WHERE id = $1",
      values: [albumId],
    };
    const albumCheckResult = await this._pool.query(albumCheckQuery);

    if (!albumCheckResult.rows.length) {
      throw new NotFoundError("Album tidak ditemukan");
    }

    const checkQuery = {
      text: "SELECT id FROM user_album_likes WHERE user_id = $1 AND album_id = $2",
      values: [userId, albumId],
    };
    const checkResult = await this._pool.query(checkQuery);

    if (checkResult.rows.length > 0) {
      throw new InvariantError("Anda sudah menyukai album ini");
    }

    const id = `like-${nanoid(16)}`;
    const insertQuery = {
      text: "INSERT INTO user_album_likes VALUES($1, $2, $3) RETURNING id",
      values: [id, userId, albumId],
    };
    await this._pool.query(insertQuery);

    await this._cacheService.delete(`albums:${albumId}`);
  }

  async unlikeAlbum(userId, albumId) {
    const query = {
      text: "DELETE FROM user_album_likes WHERE user_id = $1 AND album_id = $2 RETURNING id",
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError(
        "Gagal batal menyukai album. Data tidak ditemukan"
      );
    }

    await this._cacheService.delete(`albums:${albumId}`);
  }

  async getAlbumLikes(albumId) {
    try {
      const result = await this._cacheService.get(`albums:${albumId}`);
      return { likes: parseInt(result, 10), fromCache: true };
    } catch (error) {
      console.error("Cache error:", error);

      const query = {
        text: "SELECT COUNT(*) FROM user_album_likes WHERE album_id = $1",
        values: [albumId],
      };
      const result = await this._pool.query(query);
      const likes = parseInt(result.rows[0].count, 10);

      await this._cacheService.set(`albums:${albumId}`, likes, 1800);
      return { likes, fromCache: false };
    }
  }
}

module.exports = AlbumsService;
