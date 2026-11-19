import { ApiPropertyOptional } from '@nestjs/swagger'

export class GeminiConfigListQuerySwaggerDTO {
  @ApiPropertyOptional({ example: 1, description: 'Trang hiện tại', default: 1 })
  currentPage?: number

  @ApiPropertyOptional({
    example: 10,
    description: 'Số lượng item mỗi trang',
    default: 10
  })
  pageSize?: number

  @ApiPropertyOptional({
    example: 'configType:eq:SPEAKING_EVALUATION;isActive:eq:true',
    description: `Query string filter (field@operator:value;field2@operator:value).<br/><br/>
Hướng dẫn sử dụng:<br/>
• Định dạng: field@operator:value;field2@operator:value<br/>
<br/>
Operators hỗ trợ:<br/>
• eq: bằng (vd: configType:eq:SPEAKING_EVALUATION)<br/>
• ne: khác (vd: isActive:ne:true)<br/>
• in: thuộc tập (vd: configType:in:SPEAKING_EVALUATION,AI_KAIWA)<br/>
• nin: không thuộc tập (vd: configType:nin:PERSONALIZED_RECOMMENDATIONS,AI_KAIWA)<br/>
• like: chứa, phân biệt hoa thường (vd: modelName:like:flash)<br/>
• ilike: chứa, không phân biệt hoa thường (vd: modelName:ilike:FLASH)<br/>
• gt: lớn hơn (vd: createdAt:gt:2025-11-01)<br/>
• gte: lớn hơn hoặc bằng (vd: pageSize:gte:10)<br/>
• lt: nhỏ hơn (vd: updatedAt:lt:2025-12-01)<br/>
• lte: nhỏ hơn hoặc bằng (vd: pageSize:lte:50)<br/>
<br/>
Ví dụ:<br/>
• configType:eq:SPEAKING_EVALUATION;isActive:eq:true<br/>
• modelName:ilike:flash<br/>
<br/>
Fields phổ biến:<br/>
• configType<br/>
• isActive<br/>
• modelName`
  })
  qs?: string
}

export class GeminiModelListQuerySwaggerDTO {
  @ApiPropertyOptional({ example: 1, description: 'Trang hiện tại', default: 1 })
  currentPage?: number

  @ApiPropertyOptional({
    example: 10,
    description: 'Số lượng item mỗi trang',
    default: 10
  })
  pageSize?: number

  @ApiPropertyOptional({
    example: 'key:eq:gemini-2.5-pro;isEnabled:eq:true',
    description: `Query string filter (field@operator:value;field2@operator:value).<br/><br/>
Hướng dẫn sử dụng:<br/>
• Định dạng: field@operator:value;field2@operator:value<br/>
<br/>
Operators hỗ trợ:<br/>
• eq: bằng (vd: isEnabled:eq:true)<br/>
• ne: khác (vd: isEnabled:ne:false)<br/>
• in: thuộc tập (vd: key:in:gemini-2.5-pro,gemini-2.5-flash)<br/>
• nin: không thuộc tập (vd: key:nin:gemini-2.0-flash,gemini-2.0-flash-lite)<br/>
• like: chứa, phân biệt hoa thường (vd: displayName:like:Flash)<br/>
• ilike: chứa, không phân biệt hoa thường (vd: displayName:ilike:flash)<br/>
• gt: lớn hơn (vd: createdAt:gt:2025-11-01)<br/>
• gte: lớn hơn hoặc bằng (vd: updatedAt:gte:2025-11-01)<br/>
• lt: nhỏ hơn (vd: createdAt:lt:2025-12-01)<br/>
• lte: nhỏ hơn hoặc bằng (vd: updatedAt:lte:2025-12-01)<br/>
<br/>
Ví dụ:<br/>
• key:eq:gemini-2.5-pro;isEnabled:eq:true<br/>
• displayName:ilike:flash<br/>
<br/>
Fields phổ biến:<br/>
• key<br/>
• displayName<br/>
• isEnabled`
  })
  qs?: string
}

export class GeminiConfigModelListQuerySwaggerDTO {
  @ApiPropertyOptional({ example: 1, description: 'Trang hiện tại', default: 1 })
  currentPage?: number

  @ApiPropertyOptional({
    example: 10,
    description: 'Số lượng item mỗi trang',
    default: 10
  })
  pageSize?: number

  @ApiPropertyOptional({
    example: 'isEnabled:eq:true;name:ilike:VN',
    description: `Query string filter (field@operator:value;field2@operator:value).<br/><br/>
Hướng dẫn sử dụng:<br/>
• Định dạng: field@operator:value;field2@operator:value<br/>
<br/>
Operators hỗ trợ:<br/>
• eq: bằng (vd: isEnabled:eq:true)<br/>
• ne: khác (vd: isEnabled:ne:false)<br/>
• in: thuộc tập (vd: geminiModelId:in:1,2,3)<br/>
• nin: không thuộc tập (vd: geminiModelId:nin:4,5)<br/>
• like: chứa, phân biệt hoa thường (vd: name:like:VN)<br/>
• ilike: chứa, không phân biệt hoa thường (vd: name:ilike:guardrail)<br/>
• gt: lớn hơn (vd: createdAt:gt:2025-11-01)<br/>
• gte: lớn hơn hoặc bằng (vd: updatedAt:gte:2025-11-01)<br/>
• lt: nhỏ hơn (vd: createdAt:lt:2025-12-01)<br/>
• lte: nhỏ hơn hoặc bằng (vd: updatedAt:lte:2025-12-01)<br/>
<br/>
Ví dụ:<br/>
• isEnabled:eq:true;name:ilike:flash<br/>
• geminiModelId:in:1,2<br/>
<br/>
Fields phổ biến:<br/>
• name<br/>
• geminiModelId<br/>
• isEnabled`
  })
  qs?: string
}
