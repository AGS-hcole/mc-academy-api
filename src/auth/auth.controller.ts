import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags } from '@nestjs/swagger';
import { SignInUserDto } from './dto/requests/login-user.dto';
import { ForgotPasswordDto } from './dto/requests/forgot-password.dto';
import { ResetPasswordDto } from './dto/requests/reset-password.dto';
import { RefreshTokenDto } from './dto/requests/refresh-token.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  /**
   * Constructor
   */
  constructor(private readonly authService: AuthService) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Public Endpoints
  // -----------------------------------------------------------------------------------------------------
  @Post('sign-in')
  async signIn(@Body() signInUserDto: SignInUserDto) {
    if (!signInUserDto.email || !signInUserDto.password) {
      throw new UnauthorizedException(
        "L'adresse email et le mot de passe sont requis.",
      );
    }

    return await this.authService.signIn(
      signInUserDto.email,
      signInUserDto.password,
    );
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Auth Endpoints
  // -----------------------------------------------------------------------------------------------------
  @Post('refresh-token')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return await this.authService.refreshToken(refreshTokenDto.refreshToken);
  }
}
