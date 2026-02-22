import { ApplicationSchema } from './schemas';
import { type Application } from './schemas';
import ky from 'ky';

export const createApplicationsResource = (client: typeof ky) => ({
    apply: async (payload: { propertyId: string; notes?: string }) =>
        client
            .post('applications', { json: payload })
            .json<Application>()
            .then((data) => ApplicationSchema.parse(data)),

    my: async () =>
        client
            .get('applications/my')
            .json<Application[]>()
            .then((data) => ApplicationSchema.array().parse(data)),

    received: async () =>
        client
            .get('applications/received')
            .json<Application[]>()
            .then((data) => ApplicationSchema.array().parse(data)),

    findByProperty: async (propertyId: string) =>
        client
            .get(`applications/property/${propertyId}`)
            .json<Application[]>()
            .then((data) => ApplicationSchema.array().parse(data)),

    updateStatus: async (id: string, status: string) =>
        client
            .patch(`applications/${id}/status`, { json: { status } })
            .json<Application>()
            .then((data) => ApplicationSchema.parse(data)),
});
