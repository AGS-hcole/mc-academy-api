import { IsIn, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransportsQueryDto } from './transports-query.dto';

export class TransportsTimeseriesQueryDto extends TransportsQueryDto {
  @ApiPropertyOptional({
    description: 'Bucket type for time series',
    enum: ['daily'],
    default: 'daily',
  })
  @IsOptional()
  @IsIn(['daily'])
  bucket?: 'daily';
}

export class TransportsListQueryDto extends TransportsQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Page size',
    default: 25,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 25;

  @ApiPropertyOptional({
    description: 'Sort field and direction',
    enum: ['date:asc', 'date:desc'],
    default: 'date:desc',
  })
  @IsOptional()
  @IsIn(['date:asc', 'date:desc'])
  sort?: string = 'date:desc';
}
