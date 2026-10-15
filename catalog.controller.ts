import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('api')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get('health') health() { return this.catalog.health(); }
  @Get('home') home() { return this.catalog.home(); }
  @Get('titles') titles(@Query() query: Record<string, unknown>) { return this.catalog.titles(query); }
  @Get('search') search(@Query() query: Record<string, unknown>) { return this.catalog.search(query); }
  @Get('genres') genres() { return this.catalog.genres(); }
  @Get('titles/:id') title(@Param('id') id: string) { return this.catalog.title(id); }
  @Get('tv/:id/seasons') seasons(@Param('id') id: string) { return this.catalog.seasons(id); }
}
