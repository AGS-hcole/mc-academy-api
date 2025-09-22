import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh Token',
    nullable: false,
    required: true,
    type: 'string',
  })
  @IsString()
  refreshToken: string;
}
