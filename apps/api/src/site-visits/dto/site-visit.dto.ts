export class RequestSiteVisitDto {
    propertyId: string;
}

export class AssignModeratorDto {
    moderatorId: string;
}

export class CompleteSiteVisitDto {
    gpsLat: number;
    gpsLng: number;
    notes?: string;
}
