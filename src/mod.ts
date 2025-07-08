import { ifNullableRaise, isPortableOrRaise } from "@/utils.ts";
import { behindProxy } from "@hongminhee/x-forwarded-fetch";
import "@std/dotenv/load";
import { pipe } from "utils";
import app from "./app.tsx";
import "./logging.ts";

/**
 * Retrieves the port number from the environment variable.
 * @param envName Environment variable name for the port number.
 * @returns The port number from the environment variable.
 */
const getPort = (envName: string): number =>
  pipe(
    Deno.env.get,
    ifNullableRaise("`PORT_NUMBER` is not set in ./.env file"),
    parseInt,
    isPortableOrRaise("Invalid `PORT_NUMBER` in .env file"),
  )(envName);

Deno.serve(
  {
    port: getPort("PORT_NUMBER"),
    onListen: ({ port, hostname }) =>
      console.log("Server started at http://" + hostname + ":" + port),
  },
  behindProxy(app.fetch.bind(app)),
);
