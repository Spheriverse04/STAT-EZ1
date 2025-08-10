export interface ProcessingConfig {
  imputation: {
    method: 'mean' | 'median' | 'knn'
    knn_neighbors?: number
    column_specific?: Record<string, 'mean' | 'median' | 'knn'>
  }
  outlier_detection: {
    enabled: boolean
    method: 'zscore' | 'iqr'
    threshold: number
    action: 'remove' | 'flag'
  }
  rules: {
    enabled: boolean
    custom_rules: Array<{
      column: string
      condition: string
      action: 'remove' | 'flag' | 'transform'
      value?: string
    }>
  }
  weights: {
    enabled: boolean
    weight_column?: string
  }
  schema_mapping: Record<string, string>
}

export interface ProcessingResult {
  version_id: string
  original_filename: string
  cleaned_filename: string
  summary: {
    rows_original: number
    rows_cleaned: number
    columns: number
    missing_values_before: Record<string, number>
    missing_values_after: Record<string, number>
    outliers_detected: number
    rules_applied: number
  }
  audit_trail: string[]
  download_url: string
  report_url?: string
}

export interface DatasetVersion {
  id: string
  timestamp: string
  filename: string
  config: ProcessingConfig
  summary: ProcessingResult['summary']
  auditTrail: string[]
}

export interface ColumnInfo {
  name: string
  type: 'numeric' | 'categorical' | 'datetime' | 'text'
  missing_count: number
  unique_count: number
  sample_values: any[]
}

export interface DataPreview {
  columns: ColumnInfo[]
  sample_rows: Record<string, any>[]
  total_rows: number
}
