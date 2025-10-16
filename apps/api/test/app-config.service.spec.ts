import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppConfigService } from '../src/app-config/app-config.service';
import { defaultAppConfig } from '../src/app-config/app-config.schema';

vi.mock('@propad/config', () => ({
  env: { CONFIG_HOT_RELOAD: false }
}));

describe('AppConfigService', () => {
  const findUnique = vi.fn();
  const create = vi.fn();
  const upsert = vi.fn();
  const transaction = vi.fn(async (operations: Array<Promise<unknown>>) => {
    await Promise.all(operations);
  });
  const auditLog = vi.fn().mockResolvedValue(undefined);

  const prismaMock = {
    appConfig: {
      findUnique,
      create,
      upsert
    },
    $transaction: transaction
  } as unknown as import('../src/prisma/prisma.service').PrismaService;

  const auditMock = {
    log: auditLog
  } as unknown as import('../src/audit/audit.service').AuditService;

  beforeEach(() => {
    findUnique.mockReset();
    create.mockReset();
    upsert.mockReset();
    transaction.mockReset();
    auditLog.mockClear();
  });

  it('bootstraps default config when store is empty', async () => {
    findUnique.mockResolvedValueOnce(null);
    create.mockResolvedValueOnce({ key: 'global', jsonValue: defaultAppConfig });

    const service = new AppConfigService(prismaMock, auditMock);
    await service.onModuleInit();

    expect(create).toHaveBeenCalledWith({
      data: { key: 'global', jsonValue: defaultAppConfig }
    });
    expect(service.getConfig()).toEqual(defaultAppConfig);
  });

  it('updates config and emits notifications', async () => {
    findUnique.mockResolvedValueOnce({ key: 'global', jsonValue: defaultAppConfig });
    upsert.mockResolvedValueOnce({ key: 'global' });

    const service = new AppConfigService(prismaMock, auditMock);
    await service.onModuleInit();

    const listener = vi.fn();
    const unsubscribe = service.subscribe(listener);

    const updated = await service.updateConfig(
      {
        ...defaultAppConfig,
        ranking: {
          ...defaultAppConfig.ranking,
          tauDays: 7
        }
      },
      'admin-1'
    );

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledWith({
      action: 'config.updated',
      actorId: 'admin-1',
      targetType: 'app_config',
      targetId: 'global',
      metadata: expect.objectContaining({ ranking: expect.any(Object) })
    });
    expect(listener).toHaveBeenCalled();
    expect(updated.ranking.tauDays).toBe(7);

    unsubscribe();
  });

  it('rejects invalid config payload', async () => {
    findUnique.mockResolvedValueOnce({ key: 'global', jsonValue: defaultAppConfig });
    const service = new AppConfigService(prismaMock, auditMock);
    await service.onModuleInit();

    await expect(
      service.updateConfig(
        {
          ...defaultAppConfig,
          notifications: {
            ...defaultAppConfig.notifications,
            sendWindow: { ...defaultAppConfig.notifications.sendWindow, endHour: 5, startHour: 8 }
          }
        },
        'admin-2'
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot('"endHour must be greater than startHour"');
  });
});

