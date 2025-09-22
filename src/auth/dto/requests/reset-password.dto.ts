import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Email',
    nullable: false,
    required: true,
    type: 'string',
    example: 'youremail@example.com',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'New user password',
    nullable: false,
    required: true,
    type: 'string',
    example: 'Password123!',
  })
  @IsString()
  password: string;
}
