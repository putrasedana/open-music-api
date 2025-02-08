const { nanoid } = require("nanoid");
const { Pool } = require("pg");
const InvariantError = require("../../exceptions/InvariantError");
const NotFoundError = require("../../exceptions/NotFoundError");
const AuthorizationError = require("../../exceptions/AuthorizationError");

class PlaylistsService {
  constructor(collaborationService) {
    this._pool = new Pool();
    this._collaborationService = collaborationService;
  }

  async addPlaylist(name, owner) {
    const id = `playlist-${nanoid(16)}`;

    const query = {
      text: "INSERT INTO playlists VALUES($1, $2, $3) RETURNING id",
      values: [id, name, owner],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError("Playlist gagal ditambahkan");
    }

    return result.rows[0].id;
  }

  async getPlaylists(owner) {
    const query = {
      text: `
        SELECT DISTINCT playlists.id, playlists.name, users.username 
        FROM playlists
        JOIN users ON playlists.owner = users.id
        LEFT JOIN collaborations ON playlists.id = collaborations.playlist_id
        WHERE playlists.owner = $1 OR collaborations.user_id = $1
      `,
      values: [owner],
    };

    const result = await this._pool.query(query);

    return result.rows;
  }

  async deletePlaylistById(id, owner) {
    const checkQuery = {
      text: "SELECT owner FROM playlists WHERE id = $1",
      values: [id],
    };

    const checkResult = await this._pool.query(checkQuery);

    if (!checkResult.rows.length) {
      throw new NotFoundError("Playlist tidak ditemukan");
    }

    const playlist = checkResult.rows[0];

    if (playlist.owner !== owner) {
      throw new AuthorizationError(
        "Anda tidak memiliki akses untuk menghapus playlist ini"
      );
    }

    const deleteQuery = {
      text: "DELETE FROM playlists WHERE id = $1 RETURNING id",
      values: [id],
    };

    const deleteResult = await this._pool.query(deleteQuery);

    if (!deleteResult.rows.length) {
      throw new InvariantError("Playlist gagal dihapus");
    }
  }

  async addSongToPlaylist(playlistId, songId, userId) {
    const playlistQuery = {
      text: "SELECT id FROM playlists WHERE id = $1",
      values: [playlistId],
    };
    const playlistResult = await this._pool.query(playlistQuery);

    if (!playlistResult.rows.length) {
      throw new NotFoundError("Playlist tidak ditemukan");
    }

    const songQuery = {
      text: "SELECT id FROM songs WHERE id = $1",
      values: [songId],
    };
    const songResult = await this._pool.query(songQuery);
    if (!songResult.rows.length) {
      throw new NotFoundError("Lagu tidak ditemukan");
    }

    const id = `playlist-song-${nanoid(16)}`;
    const insertQuery = {
      text: "INSERT INTO playlist_songs (id, playlist_id, song_id) VALUES ($1, $2, $3) RETURNING id",
      values: [id, playlistId, songId],
    };
    const insertResult = await this._pool.query(insertQuery);

    if (!insertResult.rows.length) {
      throw new InvariantError("Lagu gagal ditambahkan ke playlist");
    }

    await this.addPlaylistActivity(playlistId, userId, songId, "add");
  }

  async getPlaylistSongs(playlistId) {
    const playlistQuery = {
      text: `
        SELECT playlists.id, playlists.name, users.username
        FROM playlists
        JOIN users ON playlists.owner = users.id
        WHERE playlists.id = $1
      `,
      values: [playlistId],
    };
    const playlistResult = await this._pool.query(playlistQuery);

    if (!playlistResult.rows.length) {
      throw new NotFoundError("Playlist tidak ditemukan");
    }

    const playlist = playlistResult.rows[0];

    const songsQuery = {
      text: `
        SELECT songs.id, songs.title, songs.performer
        FROM playlist_songs
        JOIN songs ON playlist_songs.song_id = songs.id
        WHERE playlist_songs.playlist_id = $1
      `,
      values: [playlistId],
    };
    const songsResult = await this._pool.query(songsQuery);

    return {
      id: playlist.id,
      name: playlist.name,
      username: playlist.username,
      songs: songsResult.rows,
    };
  }

  async deleteSongFromPlaylist(playlistId, songId, userId) {
    const playlistQuery = {
      text: "SELECT owner FROM playlists WHERE id = $1",
      values: [playlistId],
    };

    const playlistResult = await this._pool.query(playlistQuery);

    if (!playlistResult.rows.length) {
      throw new NotFoundError("Playlist tidak ditemukan");
    }

    const queryCheck = {
      text: "SELECT id FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2",
      values: [playlistId, songId],
    };
    const resultCheck = await this._pool.query(queryCheck);

    if (!resultCheck.rows.length) {
      throw new NotFoundError("Lagu tidak ditemukan dalam playlist");
    }

    const queryDelete = {
      text: "DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2 RETURNING id",
      values: [playlistId, songId],
    };
    const resultDelete = await this._pool.query(queryDelete);

    if (!resultDelete.rows.length) {
      throw new InvariantError("Lagu gagal dihapus dari playlist");
    }

    await this.addPlaylistActivity(playlistId, userId, songId, "delete");
  }

  async verifyPlaylistOwner(playlistId, userId) {
    const query = {
      text: "SELECT owner FROM playlists WHERE id = $1",
      values: [playlistId],
    };

    const result = await this._pool.query(query);

    if (result.rowCount === 0) {
      throw new NotFoundError("Playlist tidak ditemukan");
    }

    const playlist = result.rows[0];

    if (playlist.owner !== userId) {
      throw new AuthorizationError("Anda tidak memiliki akses ke playlist ini");
    }
  }

  async verifyPlaylistAccess(playlistId, userId) {
    const playlistQuery = {
      text: "SELECT owner FROM playlists WHERE id = $1",
      values: [playlistId],
    };

    const playlistResult = await this._pool.query(playlistQuery);

    if (playlistResult.rowCount === 0) {
      throw new NotFoundError("Playlist tidak ditemukan");
    }

    const playlist = playlistResult.rows[0];

    if (playlist.owner === userId) {
      return;
    }

    const collaborationQuery = {
      text: `SELECT * FROM collaborations WHERE playlist_id = $1 AND user_id = $2`,
      values: [playlistId, userId],
    };

    const collaborationResult = await this._pool.query(collaborationQuery);

    if (collaborationResult.rowCount === 0) {
      throw new AuthorizationError("Anda tidak memiliki akses ke playlist ini");
    }
  }

  async addPlaylistActivity(playlistId, userId, songId, action) {
    const query = {
      text: `INSERT INTO playlist_activities (playlist_id, user_id, song_id, action, time)
             VALUES ($1, $2, $3, $4, NOW())`,
      values: [playlistId, userId, songId, action],
    };

    await this._pool.query(query);
  }

  async getPlaylistActivities(playlistId) {
    const query = {
      text: `
        SELECT users.username, songs.title, activities.action, activities.time
        FROM playlist_activities AS activities
        JOIN users ON users.id = activities.user_id
        JOIN songs ON songs.id = activities.song_id
        WHERE activities.playlist_id = $1
        ORDER BY activities.time ASC
      `,
      values: [playlistId],
    };

    const result = await this._pool.query(query);
    return result.rows;
  }
}

module.exports = PlaylistsService;
