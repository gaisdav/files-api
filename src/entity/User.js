import { EntitySchema } from "typeorm";

export const User = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      primary: true,
      type: "varchar",
    },
    password: {
      type: "varchar",
    },
    refreshToken: {
      type: "varchar",
    },
    createdAt: {
      createDate: true,
    },
  },
});
