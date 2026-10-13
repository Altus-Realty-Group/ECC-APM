import { z } from "zod";

// Validate fields already consumed by these adapters; no new remote endpoint or binding.
const DbxEntry = z.object({id: z.string().optional(), name: z.string(),
  ".tag": z.string(), path_lower: z.string().optional()}).passthrough();
export const DropboxFolder = z.object({entries: z.array(DbxEntry)}).passthrough();
export const DropboxLink = z.object({link: z.string().url()}).passthrough();
export const DropboxSearch = z.object({matches: z.array(z.object({
  metadata: z.object({metadata: DbxEntry}).passthrough()
}).passthrough())}).passthrough();
export const GraphToken = z.object({access_token: z.string().min(1)}).passthrough();
export const GraphBuckets = z.object({value: z.array(z.object({id: z.string().min(1)}).passthrough())}).passthrough();
export const GraphTask = z.object({id: z.string().min(1), "@odata.etag": z.string().optional()}).passthrough();
export const GraphItems = z.object({value: z.array(z.object({id: z.string(), name: z.string(),
  webUrl: z.string().optional(), file: z.unknown().optional()}).passthrough())}).passthrough();
export const GraphObject = z.record(z.string(), z.unknown());
export const GeocodeResponse = z.object({results: z.array(z.object({
  geometry: z.object({location: z.object({lat: z.number().finite(), lng: z.number().finite()})}),
  formatted_address: z.string().optional()
}).passthrough())}).passthrough();
