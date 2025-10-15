import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type RatingDistribution = Record<
  '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10',
  number
>;

export class UserBriefDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User first name' })
  firstName: string;

  @ApiProperty({ description: 'User last name' })
  lastName: string;

  @ApiPropertyOptional({ description: 'User avatar URL' })
  avatarUrl?: string;
}

export class GlobalRatingsDto {
  @ApiProperty({ description: 'Average rating (null if no ratings)' })
  average: number | null;

  @ApiProperty({ description: 'Total number of ratings' })
  count: number;

  @ApiProperty({
    description: 'Distribution of ratings by score',
    example: {
      '1': 0,
      '2': 1,
      '3': 2,
      '4': 3,
      '5': 5,
      '6': 8,
      '7': 10,
      '8': 12,
      '9': 7,
      '10': 4,
    },
  })
  distribution: RatingDistribution;

  @ApiProperty({ description: 'Number of sessions with at least one rating' })
  ratedSessions: number;

  @ApiProperty({ description: 'Number of sessions with no ratings' })
  unratedSessions: number;
}

export class PerUserRatingDto {
  @ApiProperty({ description: 'User information', type: UserBriefDto })
  user: UserBriefDto;

  @ApiProperty({ description: 'Average rating for this user' })
  average: number;

  @ApiProperty({ description: 'Number of ratings for this user' })
  count: number;
}

export class TopBottomUserDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Average rating' })
  average: number;

  @ApiProperty({ description: 'Number of ratings' })
  count: number;
}

export class ContractSplitDto {
  @ApiProperty({ description: 'Number of ratings for sessions under contract' })
  contractCount: number;

  @ApiProperty({
    description: 'Number of ratings for sessions outside contract',
  })
  nonContractCount: number;
}

export class RatingsScopeDto {
  @ApiPropertyOptional({ description: 'User ID filter' })
  userId?: string;

  @ApiPropertyOptional({
    description: 'Contract scope filter',
    enum: ['all', 'contract', 'noContract'],
  })
  contractScope?: 'all' | 'contract' | 'noContract';
}

export class RatingsPeriodDto {
  @ApiProperty({ description: 'Start date of the period' })
  from: string;

  @ApiProperty({ description: 'End date of the period' })
  to: string;
}

export class RatingsSummaryDto {
  @ApiProperty({ description: 'Period information', type: RatingsPeriodDto })
  period: RatingsPeriodDto;

  @ApiProperty({ description: 'Scope information', type: RatingsScopeDto })
  scope: RatingsScopeDto;

  @ApiProperty({
    description: 'Global ratings aggregates',
    type: GlobalRatingsDto,
  })
  global: GlobalRatingsDto;

  @ApiPropertyOptional({
    description: 'Per-user aggregates (when userId not specified)',
    type: [PerUserRatingDto],
  })
  perUser?: PerUserRatingDto[];

  @ApiPropertyOptional({
    description: 'Top 5 users by average rating (min 3 ratings)',
    type: [TopBottomUserDto],
  })
  topUsers?: TopBottomUserDto[];

  @ApiPropertyOptional({
    description: 'Bottom 5 users by average rating (min 3 ratings)',
    type: [TopBottomUserDto],
  })
  bottomUsers?: TopBottomUserDto[];

  @ApiProperty({
    description: 'Contract split for pie chart',
    type: ContractSplitDto,
  })
  contractSplit: ContractSplitDto;
}
