import { z } from "zod";
import { v } from "convex/values";

export const zId = <T extends string>(table: T) =>
  z.string() as z.ZodType<`${T}/${string}`>;

export const zObject = <T extends Record<string, z.ZodTypeAny>>(shape: T) =>
  z.object(shape);

export const zUnion = <T extends readonly [z.ZodTypeAny, ...z.ZodTypeAny[]]>(types: T) =>
  z.union(types);

export const zLiteral = <T extends string | number | boolean>(value: T) =>
  z.literal(value);

export const zOptional = <T extends z.ZodTypeAny>(type: T) =>
  z.optional(type);

export const zArray = <T extends z.ZodTypeAny>(type: T) =>
  z.array(type);
