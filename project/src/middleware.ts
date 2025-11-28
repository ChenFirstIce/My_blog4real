import { sequence } from "astro:middleware";
import { onRequest as cn } from "astro-middleware-cn";

export const onRequest = sequence(cn);
