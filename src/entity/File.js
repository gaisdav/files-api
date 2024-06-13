import { EntitySchema } from "typeorm";

export const File = new EntitySchema({
  name: "File",
  tableName: "files",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },
    name: {
      type: "varchar",
    },
    extension: {
      type: "varchar",
    },
    mimetype: {
      type: "varchar",
    },
    size: {
      type: "int",
    },
    createdAt: {
      createDate: true,
    },
  },
});
