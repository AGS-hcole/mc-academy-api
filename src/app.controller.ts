import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('API Status')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // ------------------------------------------------------------------------
  // PUBLIC - GET /status
  // ------------------------------------------------------------------------

  @Get('status')
  @ApiOperation({ summary: 'Check if the API is online' })
  @ApiResponse({ status: 200, description: 'API is online' })
  getStatus(): any {
    return {
      ok: true,
      message: 'Status : Online, Swagger: ' + process.env.ENABLE_SWAGGER,
    };
  }
}
