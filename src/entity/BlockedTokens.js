import { EntitySchema } from "typeorm";

export const BlockedTokens = new EntitySchema({
  name: "BlockedTokens",
  tableName: "blockedTokens",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },
    token: {
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
