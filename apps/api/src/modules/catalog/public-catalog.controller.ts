import { Controller, Get, Param, Query } from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import { ListProductsQueryDto } from "./dto/list-products-query.dto";

@Controller("public/catalog/products")
export class PublicCatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(@Query() query: ListProductsQueryDto): Promise<unknown> {
    return this.catalog.publicList(query);
  }

  @Get(":slug")
  getBySlug(@Param("slug") slug: string): Promise<unknown> {
    return this.catalog.publicGetBySlug(slug);
  }
}
