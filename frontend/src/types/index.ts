export interface ProcessingConfig {
  imputation: {
    method: 'mean' | 'median' | 'knn'
    delete_null_rows?: boolean
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
  mixed_columns?: any[]
  sample_rows: Record<string, any>[]
  total_rows: number
  requires_decisions?: boolean
  data_quality_score?: number
  recommendations?: string[]
}

export interface DataSummary {
  total_rows: number
  total_columns: number
  numeric_columns: number
  categorical_columns: number
  missing_values: number
  duplicate_rows: number
  memory_usage: number
  column_stats: Record<string, {
    type: 'numeric' | 'categorical'
    mean?: number
    median?: number
    std?: number
    min?: number
    max?: number
    unique_count?: number
    most_frequent?: string
    missing_count: number
  }>
}

export interface SQLQueryResult {
  success: boolean
  data: Record<string, any>[]
  columns: string[]
  row_count: number
}

export interface VisualizationConfig {
  chart_type: 'histogram' | 'bar' | 'pie' | 'scatter' | 'line' | 'box'
  x_column: string
  y_column?: string
  color_column?: string
}

export interface DataQualityMetrics {
  completeness_score: number
  consistency_score: number
  validity_score: number
  uniqueness_score: number
  overall_score: number
  issues: Array<{
    type: 'missing_data' | 'duplicates' | 'outliers' | 'inconsistent_format' | 'invalid_values'
    severity: 'low' | 'medium' | 'high'
    description: string
    affected_columns: string[]
    recommendation: string
  }>
}

export interface ProfessionalAnalysisResult {
  statistical_summary: Record<string, {
    mean?: number
    median?: number
    mode?: any
    std_dev?: number
    variance?: number
    skewness?: number
    kurtosis?: number
    percentiles?: Record<string, number>
  }>
  correlation_matrix?: Record<string, Record<string, number>>
  data_distribution: Record<string, {
    distribution_type: 'normal' | 'skewed' | 'uniform' | 'bimodal' | 'unknown'
    normality_test_p_value?: number
  }>
  outlier_analysis: Record<string, {
    outlier_count: number
    outlier_percentage: number
    detection_method: string
    outlier_indices: number[]
  }>
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json' | 'pdf_report' | 'summary_dashboard' | 'api_endpoint'
  filename: string
  options: {
    include_metadata: boolean
    include_charts: boolean
    compression: 'none' | 'gzip' | 'zip'
  }
}

export interface NotificationMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: string
  read: boolean
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  default_imputation_method: 'mean' | 'median' | 'knn'
  auto_outlier_detection: boolean
  export_format_preference: string
  notification_settings: {
    processing_complete: boolean
    quality_alerts: boolean
    export_ready: boolean
  }
}

