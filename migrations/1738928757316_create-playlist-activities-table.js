exports.up = (pgm) => {
  pgm.createTable("playlist_activities", {
    id: {
      type: "SERIAL",
      primaryKey: true,
    },
    playlist_id: {
      type: "TEXT",
      notNull: true,
      references: "playlists(id)",
      onDelete: "CASCADE",
    },
    user_id: {
      type: "TEXT",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    song_id: {
      type: "TEXT",
      notNull: true,
      references: "songs(id)",
      onDelete: "CASCADE",
    },
    action: {
      type: "TEXT",
      notNull: true,
      check: "action IN ('add', 'delete')",
    },
    time: {
      type: "TIMESTAMP",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("playlist_activities");
};
