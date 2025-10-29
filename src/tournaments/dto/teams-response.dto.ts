import { ApiProperty } from '@nestjs/swagger';

class TeamMemberDto {
  @ApiProperty()
  memberId: string;

  @ApiProperty()
  participantId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  firstname: string;

  @ApiProperty()
  lastname: string;

  @ApiProperty({ nullable: true })
  currentRanking?: number | null;

  @ApiProperty({ nullable: true })
  rankSnapshot?: number | null;
}

class TeamWithMembersDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderIndex: number;

  @ApiProperty()
  locked: boolean;

  @ApiProperty({ nullable: true })
  placement?: number | null;

  @ApiProperty({ nullable: true })
  notes?: string | null;

  @ApiProperty({ type: [TeamMemberDto] })
  members: TeamMemberDto[];
}

class BenchParticipantDto {
  @ApiProperty()
  participantId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  firstname: string;

  @ApiProperty()
  lastname: string;

  @ApiProperty({ nullable: true })
  currentRanking?: number | null;

  @ApiProperty({ nullable: true })
  rankSnapshot?: number | null;
}

export class TeamsResponseDto {
  @ApiProperty({ type: [TeamWithMembersDto] })
  teams: TeamWithMembersDto[];

  @ApiProperty({ type: [BenchParticipantDto] })
  bench: BenchParticipantDto[];
}
