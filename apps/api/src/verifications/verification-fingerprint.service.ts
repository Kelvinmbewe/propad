import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';

@Injectable()
export class VerificationFingerprintService {
    private readonly logger = new Logger(VerificationFingerprintService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Process evidence URLs for a verification item.
     * Downloads files, generates hashes, and stores in VerificationEvidence.
     */
    async processItemEvidence(itemId: string, urls: string[]) {
        this.logger.log(`Processing evidence for item ${itemId} (${urls.length} files)`);

        for (const url of urls) {
            try {
                // Check if already processed
                const existing = await this.prisma.verificationEvidence.findFirst({
                    where: { itemId, url }
                });

                if (existing) {
                    continue; // Skip if already fingerprinted
                }

                // Download and Hash
                // NOTE: In production, consider streaming for large files to avoid memory issues.
                // For images < 10MB, buffer is acceptable.
                const response = await fetch(url);
                if (!response.ok) {
                    this.logger.warn(`Failed to fetch evidence URL: ${url} (${response.status})`);
                    continue;
                }

                const arrayBuffer = await response.arrayBuffer();
                const data = new Uint8Array(arrayBuffer);
                const hash = createHash('sha256').update(data).digest('hex');
                const size = arrayBuffer.byteLength;
                const mimeType = response.headers.get('content-type') || 'application/octet-stream';

                await this.prisma.verificationEvidence.create({
                    data: {
                        itemId,
                        url,
                        fileHash: hash,
                        sizeBytes: size,
                        mimeType
                    }
                });

                this.logger.debug(`Fingerprinted ${url} -> ${hash.substring(0, 8)}`);

            } catch (error) {
                this.logger.error(`Error fingerprinting evidence ${url}: ${error}`);
            }
        }
    }

    /**
     * Check for duplicate usage of the same document hash.
     */
    async checkDuplicateUsage(itemId: string) {
        const evidence = await this.prisma.verificationEvidence.findMany({
            where: { itemId }
        });

        const flags: string[] = [];
        const relatedItemIds: string[] = [];

        for (const file of evidence) {
            if (!file.fileHash) continue;

            // Find other occurrences of this hash
            const duplicates = await this.prisma.verificationEvidence.findMany({
                where: {
                    fileHash: file.fileHash,
                    itemId: { not: itemId } // Exclude self
                },
                include: {
                    item: {
                        include: {
                            verificationRequest: {
                                select: {
                                    propertyId: true,
                                    requesterId: true
                                }
                            }
                        }
                    }
                }
            });

            if (duplicates.length > 0) {
                const currentItem = await this.prisma.verificationRequestItem.findUnique({
                    where: { id: itemId },
                    include: { verificationRequest: true }
                });

                if (!currentItem) continue;

                const currentUser = currentItem.verificationRequest.requesterId;
                const currentProperty = currentItem.verificationRequest.propertyId;

                for (const dup of duplicates) {
                    const dupUser = dup.item.verificationRequest.requesterId;
                    const dupProperty = dup.item.verificationRequest.propertyId;

                    if (dupUser !== currentUser) {
                        flags.push('DOCUMENT_SHARED_ACROSS_USERS');
                        this.logger.warn(`Hash collision between Users: ${currentUser} vs ${dupUser}`);
                    } else if (dupProperty !== currentProperty) {
                        flags.push('DOCUMENT_REUSED_ACROSS_PROPERTIES');
                        this.logger.warn(`Hash collision Same User, Diff Property: ${currentProperty} vs ${dupProperty}`);
                    }

                    relatedItemIds.push(dup.itemId);
                }
            }
        }

        return {
            flags: Array.from(new Set(flags)),
            relatedItemIds: Array.from(new Set(relatedItemIds))
        };
    }
}
