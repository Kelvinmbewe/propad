import { Role } from '@propad/config';

export const PERMISSIONS = {
    PAYOUT_REQUEST: 'payout.request',
    PAYOUT_APPROVE: 'payout.approve',
    ADSENSE_VIEW: 'adsense.view',
};

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
    [Role.ADMIN]: [
        PERMISSIONS.PAYOUT_APPROVE,
        PERMISSIONS.ADSENSE_VIEW,
    ],
    [Role.AGENT]: [
        PERMISSIONS.PAYOUT_REQUEST,
    ],
    [Role.LANDLORD]: [
        PERMISSIONS.PAYOUT_REQUEST,
    ],
    // Add others as needed
    [Role.USER]: [],
    [Role.VERIFIER]: [],
    [Role.MODERATOR]: [],
    [Role.COMPANY_ADMIN]: [],
    [Role.COMPANY_AGENT]: [],
    [Role.INDEPENDENT_AGENT]: [PERMISSIONS.PAYOUT_REQUEST],
    [Role.SELLER]: [],
    [Role.TENANT]: [],
    [Role.BUYER]: [],
    [Role.ADVERTISER]: [],
};
