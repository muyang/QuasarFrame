import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { places } from '@/db/schema';
import { locations } from '@/data/locations';

export function getCataloguePlace(locationId: string) {
  return locations.find((item) => item.id === locationId) ?? null;
}

/** Creates only a named catalogue entry; its coordinates remain illustrative. */
export function ensureIllustrativePlace(locationId: string) {
  const catalogue = getCataloguePlace(locationId);
  if (!catalogue) return null;
  const existing = db.select().from(places).where(eq(places.catalogueId, locationId)).get();
  if (existing) return existing;
  const id = crypto.randomUUID();
  db.insert(places).values({ id, catalogueId: locationId, name: catalogue.name, province: catalogue.province }).onConflictDoNothing().run();
  return db.select().from(places).where(eq(places.catalogueId, locationId)).get() ?? null;
}

export function listIllustrativePlaces() {
  return db.select().from(places).all();
}
