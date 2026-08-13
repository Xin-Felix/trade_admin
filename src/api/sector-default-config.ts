import { http } from "@/utils/http";

export interface SectorDefaultConfigItem {
  id: number;
  sector_type: "concept" | "industry";
  sector_ids: string[];
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SectorDefaultConfigForm {
  sector_type: "concept" | "industry";
  sector_ids: string[];
  is_enabled: boolean;
}

export interface SectorDefaultConfigListResult {
  success: boolean;
  data: SectorDefaultConfigItem[];
}

export interface SectorDefaultConfigDetailResult {
  success: boolean;
  data: SectorDefaultConfigItem;
}

export interface SectorDefaultConfigOperationResult {
  success: boolean;
  message: string;
}

/** 获取配置列表 */
export const getSectorDefaultConfigList = () => {
  return http.request<SectorDefaultConfigListResult>(
    "get",
    "/api/v1/admin/sector-default-configs"
  );
};

/** 创建配置 */
export const createSectorDefaultConfig = (data: SectorDefaultConfigForm) => {
  return http.request<SectorDefaultConfigDetailResult>(
    "post",
    "/api/v1/admin/sector-default-configs",
    { data }
  );
};

/** 更新配置 */
export const updateSectorDefaultConfig = (
  id: number,
  data: Partial<SectorDefaultConfigForm>
) => {
  return http.request<SectorDefaultConfigDetailResult>(
    "put",
    `/api/v1/admin/sector-default-configs/${id}`,
    { data }
  );
};

/** 删除配置 */
export const deleteSectorDefaultConfig = (id: number) => {
  return http.request<SectorDefaultConfigOperationResult>(
    "delete",
    `/api/v1/admin/sector-default-configs/${id}`
  );
};

export interface ConceptOptionItem {
  concept_id: string;
  concept_name: string;
  stock_count: number;
  is_default: boolean;
}

export interface IndustryOptionItem {
  name: string;
  stock_count: number;
}

export interface ConceptListResult {
  success: boolean;
  data: {
    concepts: ConceptOptionItem[];
    default_ids: string[];
  };
}

export interface IndustryListResult {
  success: boolean;
  data: {
    industries: IndustryOptionItem[];
    total: number;
    default_ids: string[];
  };
}

/** 获取可选概念列表 */
export const getAvailableConcepts = () => {
  return http.request<ConceptListResult>("get", "/api/v1/analytics/concept-flow/concepts");
};

/** 获取可选行业列表 */
export const getAvailableIndustries = () => {
  return http.request<IndustryListResult>("get", "/api/v1/analytics/industry-flow/list");
};
