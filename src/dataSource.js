import "reflect-metadata";
import { DataSource } from "typeorm";

/**
 * There should be environment variables here, but I set static values for the test task.
 */
export const dataSource = new DataSource({
  type: "mysql",
  host: "localhost",
  port: 3306,
  username: "test",
  password: "test",
  database: "test",
  entities: ["src/entity/*.js"],
  logging: true,
  synchronize: true,
  migrations: [],
  subscribers: [],
});
