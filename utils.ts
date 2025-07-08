import { raise } from "utils";

/**
 * Raises an error if the value is nullable(null or undefined).
 * @param {string} reason The reason for raising an error if the value is null or undefined.
 * @returns {(value: T | null | undefined) => T} A function that takes a value and returns it if it's not null or undefined, otherwise raises an error.
 */
export const ifNullableRaise =
  (reason: string): <T>(value: T | null | undefined) => T =>
  <T>(value: T | null | undefined): T => value ?? raise(reason);

/**
 * Checks the input can be a valid port number(0-65535).
 * If not, raises an error with the provided reason.
 * @param {string} reason The reason for raising an error if the port number is invalid.
 * @returns {(port: number) => number} A function that takes a port number and returns it if it's valid, otherwise raises an error.
 */
export const isPortableOrRaise =
  (reason: string): (port: number) => number => (port: number) =>
    isNaN(port) || port < 0 || port > 65535 ? raise(reason) : port;
