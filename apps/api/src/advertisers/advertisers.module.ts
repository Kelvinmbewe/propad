import { Module } from '@nestjs/common';
import { AdvertisersService } from './advertisers.service';
import { AdvertisersController } from './advertisers.controller';

@Module({
    providers: [AdvertisersService],
    controllers: [AdvertisersController],
    exports: [AdvertisersService],
})
export class AdvertisersModule { }
