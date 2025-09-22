import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: "User's email",
    type: 'string',
    example: 'adress@domain.com',
  })
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'First name of the user',
    type: 'string',
    example: 'Mikael',
  })
  @IsString()
  firstname: string;

  @ApiProperty({
    description: 'Last name of the user',
    type: 'string',
    example: 'Jordan',
  })
  @IsString()
  lastname: string;

  @ApiProperty({
    description: 'Role of the user',
    type: 'string',
    example: 'admin',
  })
  @IsString()
  role: Role;
}
