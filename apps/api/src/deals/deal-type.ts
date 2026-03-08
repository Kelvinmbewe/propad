import { DealType, ListingIntent, Property } from "@prisma/client";

export function inferDealTypeFromProperty(
  property: Pick<Property, "listingIntent">,
): DealType {
  if (property.listingIntent === ListingIntent.TO_RENT) {
    return DealType.RENT;
  }
  return DealType.SALE;
}
