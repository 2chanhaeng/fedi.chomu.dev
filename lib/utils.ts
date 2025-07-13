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

/**
 * Creates a lazily‐evaluated mapper over an iterable.
 *
 * @param {(item: T) => U} fn - A transform function that maps an element of type T to type U.
 * @returns A function that, when given an iterable of T, returns a generator yielding U.
 *
 * @example
 * const nums = [1, 2, 3];
 * const double = map((n: number) => n * 2);
 * for (const value of double(nums)) {
 *   console.log(value); // 2, 4, 6
 * }
 */
export const map = <T, U>(
  fn: (item: T) => U,
): (arr: Iterable<T>) => Generator<U> =>
  function* (arr: Iterable<T>): Generator<U> {
    for (const item of arr) yield fn(item);
  };

/**
 * Converts an iterable to an array.
 * @param {Iterable<T>} iterable - The iterable to convert.
 * @returns {T[]} An array containing all elements from the iterable.
 */
export const toArray = <T>(iterable: Iterable<T>): T[] => Array.from(iterable);
