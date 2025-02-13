exports.up = (pgm) => {
  pgm.addColumns("songs", {
    album_id: {
      type: "VARCHAR(50)",
      notNull: true,
    },
  });

  pgm.addConstraint("songs", "fk_songs.album_id_albums.id", {
    foreignKeys: {
      columns: "album_id",
      references: "albums(id)",
      onDelete: "CASCADE",
    },
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint("songs", "fk_songs.album_id_albums.id");
  pgm.dropColumns("songs", ["album_id"]);
};
