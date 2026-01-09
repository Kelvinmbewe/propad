    async findReceivedApplications(userId: string) {
    return this.prisma.application.findMany({
        where: {
            property: {
                OR: [
                    { landlordId: userId },
                    { agentOwnerId: userId }
                ]
            }
        },
        include: {
            property: {
                select: { id: true, title: true, type: true, price: true, currency: true, media: { take: 1 } }
            },
            user: {
                select: { id: true, name: true, email: true, phone: true, profilePhoto: true }
            }
        },
        orderBy: { createdAt: 'desc' },
    });
}

    async findMyApplications(userId: string) {
