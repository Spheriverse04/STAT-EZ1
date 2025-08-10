from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.impute import KNNImputer
from sklearn.preprocessing import StandardScaler
from scipy import stats
import os
import datetime
import json
import uuid
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
CLEANED_FOLDER = 'cleaned_files'
REPORTS_FOLDER = 'reports'

for folder in [UPLOAD_FOLDER, CLEANED_FOLDER, REPORTS_FOLDER]:
    os.makedirs(folder, exist_ok=True)

class DataProcessor:
    def __init__(self, df, config):
        self.df = df.copy()
        self.original_df = df.copy()
        self.config = config
        self.audit_trail = []
        self.version_id = str(uuid.uuid4())
        
    def log_action(self, message):
        timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        self.audit_trail.append(f"[{timestamp}] {message}")
        
    def get_column_info(self, df):
        """Extract detailed column information"""
        columns = []
        for col in df.columns:
            col_data = df[col]
            
            # Determine column type
            if pd.api.types.is_numeric_dtype(col_data):
                col_type = 'numeric'
            elif pd.api.types.is_datetime64_any_dtype(col_data):
                col_type = 'datetime'
            else:
                # Check if it's categorical (limited unique values)
                unique_ratio = col_data.nunique() / len(col_data)
                col_type = 'categorical' if unique_ratio < 0.5 else 'text'
            
            # Get sample values (non-null)
            sample_values = col_data.dropna().head(5).tolist()
            
            columns.append({
                'name': col,
                'type': col_type,
                'missing_count': int(col_data.isnull().sum()),
                'unique_count': int(col_data.nunique()),
                'sample_values': sample_values
            })
            
        return columns
        
    def handle_missing_values(self):
        """Handle missing values based on configuration"""
        self.log_action("Starting missing value imputation")
        
        missing_before = self.df.isnull().sum().to_dict()
        
        # Get numeric columns for imputation
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        
        if len(numeric_cols) == 0:
            self.log_action("No numeric columns found for imputation")
            return missing_before, self.df.isnull().sum().to_dict()
        
        # Apply column-specific methods first
        column_specific = self.config['imputation'].get('column_specific', {})
        
        for col in numeric_cols:
            if col in column_specific and column_specific[col]:
                method = column_specific[col]
            else:
                method = self.config['imputation']['method']
                
            if self.df[col].isnull().sum() > 0:
                if method == 'mean':
                    fill_value = self.df[col].mean()
                    self.df[col].fillna(fill_value, inplace=True)
                    self.log_action(f"Imputed {col} with mean: {fill_value:.2f}")
                    
                elif method == 'median':
                    fill_value = self.df[col].median()
                    self.df[col].fillna(fill_value, inplace=True)
                    self.log_action(f"Imputed {col} with median: {fill_value:.2f}")
                    
                elif method == 'knn':
                    # Use KNN imputation
                    knn_cols = [col]  # Start with just this column
                    # Add other numeric columns that have fewer missing values
                    for other_col in numeric_cols:
                        if other_col != col and self.df[other_col].isnull().sum() < self.df[col].isnull().sum():
                            knn_cols.append(other_col)
                    
                    if len(knn_cols) > 1:
                        n_neighbors = min(self.config['imputation'].get('knn_neighbors', 5), 
                                        len(self.df.dropna(subset=knn_cols)))
                        if n_neighbors > 0:
                            imputer = KNNImputer(n_neighbors=n_neighbors)
                            self.df[knn_cols] = imputer.fit_transform(self.df[knn_cols])
                            self.log_action(f"Applied KNN imputation to {col} with {n_neighbors} neighbors")
                        else:
                            # Fallback to mean if not enough data for KNN
                            fill_value = self.df[col].mean()
                            self.df[col].fillna(fill_value, inplace=True)
                            self.log_action(f"Fallback: Imputed {col} with mean: {fill_value:.2f}")
                    else:
                        # Fallback to mean if only one column
                        fill_value = self.df[col].mean()
                        self.df[col].fillna(fill_value, inplace=True)
                        self.log_action(f"Fallback: Imputed {col} with mean: {fill_value:.2f}")
        
        missing_after = self.df.isnull().sum().to_dict()
        return missing_before, missing_after
        
    def detect_outliers(self):
        """Detect and handle outliers"""
        if not self.config['outlier_detection']['enabled']:
            return 0
            
        self.log_action("Starting outlier detection")
        outliers_detected = 0
        
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        method = self.config['outlier_detection']['method']
        threshold = self.config['outlier_detection']['threshold']
        action = self.config['outlier_detection']['action']
        
        outlier_mask = pd.Series([False] * len(self.df))
        
        for col in numeric_cols:
            if method == 'zscore':
                z_scores = np.abs(stats.zscore(self.df[col].dropna()))
                col_outliers = z_scores > threshold
                # Map back to original dataframe indices
                outlier_indices = self.df[col].dropna().index[col_outliers]
                outlier_mask.loc[outlier_indices] = True
                
            elif method == 'iqr':
                Q1 = self.df[col].quantile(0.25)
                Q3 = self.df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - threshold * IQR
                upper_bound = Q3 + threshold * IQR
                col_outliers = (self.df[col] < lower_bound) | (self.df[col] > upper_bound)
                outlier_mask = outlier_mask | col_outliers
        
        outliers_detected = outlier_mask.sum()
        
        if outliers_detected > 0:
            if action == 'remove':
                self.df = self.df[~outlier_mask]
                self.log_action(f"Removed {outliers_detected} outlier rows using {method} method")
            else:  # flag
                self.df['_outlier_flag'] = outlier_mask
                self.log_action(f"Flagged {outliers_detected} outlier rows using {method} method")
        
        return outliers_detected
        
    def apply_rules(self):
        """Apply custom rules"""
        if not self.config['rules']['enabled']:
            return 0
            
        self.log_action("Applying custom rules")
        rules_applied = 0
        
        for rule in self.config['rules']['custom_rules']:
            column = rule['column']
            condition = rule['condition']
            action = rule['action']
            value = rule.get('value', '')
            
            if column not in self.df.columns:
                continue
                
            # Build condition mask
            mask = pd.Series([False] * len(self.df))
            
            try:
                if condition == 'greater_than':
                    mask = self.df[column] > float(value)
                elif condition == 'less_than':
                    mask = self.df[column] < float(value)
                elif condition == 'equals':
                    mask = self.df[column] == value
                elif condition == 'not_equals':
                    mask = self.df[column] != value
                elif condition == 'contains':
                    mask = self.df[column].astype(str).str.contains(value, na=False)
                elif condition == 'not_contains':
                    mask = ~self.df[column].astype(str).str.contains(value, na=False)
                elif condition == 'is_null':
                    mask = self.df[column].isnull()
                elif condition == 'is_not_null':
                    mask = self.df[column].notnull()
                
                affected_rows = mask.sum()
                if affected_rows > 0:
                    if action == 'remove':
                        self.df = self.df[~mask]
                        self.log_action(f"Rule: Removed {affected_rows} rows where {column} {condition} {value}")
                    elif action == 'flag':
                        flag_col = f'_rule_flag_{column}_{condition}'
                        self.df[flag_col] = mask
                        self.log_action(f"Rule: Flagged {affected_rows} rows where {column} {condition} {value}")
                    
                    rules_applied += 1
                    
            except Exception as e:
                self.log_action(f"Rule error for {column} {condition} {value}: {str(e)}")
        
        return rules_applied
        
    def apply_schema_mapping(self):
        """Apply schema mapping"""
        mapping = self.config.get('schema_mapping', {})
        if not mapping:
            return
            
        # Create reverse mapping for renaming
        rename_map = {}
        for original_col, mapped_type in mapping.items():
            if mapped_type != 'other' and mapped_type != original_col:
                # Find a unique name for the mapped type
                new_name = mapped_type
                counter = 1
                while new_name in self.df.columns and new_name != original_col:
                    new_name = f"{mapped_type}_{counter}"
                    counter += 1
                
                if new_name != original_col:
                    rename_map[original_col] = new_name
        
        if rename_map:
            self.df.rename(columns=rename_map, inplace=True)
            self.log_action(f"Applied schema mapping: {rename_map}")
            
    def process(self):
        """Main processing pipeline"""
        self.log_action(f"Started processing with version ID: {self.version_id}")
        
        # Store original stats
        original_rows = len(self.original_df)
        original_cols = len(self.original_df.columns)
        
        # Apply schema mapping first
        self.apply_schema_mapping()
        
        # Handle missing values
        missing_before, missing_after = self.handle_missing_values()
        
        # Detect outliers
        outliers_detected = self.detect_outliers()
        
        # Apply custom rules
        rules_applied = self.apply_rules()
        
        # Final stats
        final_rows = len(self.df)
        final_cols = len(self.df.columns)
        
        self.log_action(f"Processing complete: {original_rows} → {final_rows} rows, {outliers_detected} outliers, {rules_applied} rules applied")
        
        return {
            'rows_original': original_rows,
            'rows_cleaned': final_rows,
            'columns': final_cols,
            'missing_values_before': {k: int(v) for k, v in missing_before.items() if v > 0},
            'missing_values_after': {k: int(v) for k, v in missing_after.items() if v > 0},
            'outliers_detected': int(outliers_detected),
            'rules_applied': int(rules_applied)
        }

@app.route('/preview', methods=['POST'])
def preview_data():
    """Preview uploaded data without processing"""
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    try:
        # Read file
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file, nrows=1000)  # Limit preview to first 1000 rows
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file, nrows=1000)
        else:
            return jsonify({"error": "Unsupported file type"}), 400
        
        # Create processor to get column info
        processor = DataProcessor(df, {})
        columns = processor.get_column_info(df)
        
        # Get sample rows
        sample_rows = df.head(10).fillna('').to_dict('records')
        
        return jsonify({
            'columns': columns,
            'sample_rows': sample_rows,
            'total_rows': len(df)
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to preview file: {str(e)}"}), 500

@app.route('/process', methods=['POST'])
def process_data():
    """Process uploaded data with configuration"""
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    try:
        # Parse configuration
        config = json.loads(request.form.get('config', '{}'))
        
        # Read file
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file)
        else:
            return jsonify({"error": "Unsupported file type"}), 400
        
        # Process data
        processor = DataProcessor(df, config)
        summary = processor.process()
        
        # Save cleaned file
        cleaned_filename = f"cleaned_{processor.version_id}_{file.filename}"
        cleaned_filepath = os.path.join(CLEANED_FOLDER, cleaned_filename)
        
        if file.filename.endswith('.csv'):
            processor.df.to_csv(cleaned_filepath, index=False)
        else:
            processor.df.to_excel(cleaned_filepath, index=False)
        
        return jsonify({
            'version_id': processor.version_id,
            'original_filename': file.filename,
            'cleaned_filename': cleaned_filename,
            'summary': summary,
            'audit_trail': processor.audit_trail,
            'download_url': f'/api/download/{cleaned_filename}'
        })
        
    except Exception as e:
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500

@app.route('/download/<filename>')
def download_file(filename):
    """Download processed file"""
    try:
        return send_from_directory(CLEANED_FOLDER, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

# Legacy endpoint for backward compatibility
@app.route('/upload', methods=['POST'])
def upload_file():
    """Legacy upload endpoint with basic processing"""
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        # Read file
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file)
        else:
            return jsonify({"error": "Unsupported file type"}), 400

        # Basic processing with default config
        config = {
            'imputation': {'method': 'mean'},
            'outlier_detection': {'enabled': False},
            'rules': {'enabled': False},
            'schema_mapping': {}
        }
        
        processor = DataProcessor(df, config)
        summary = processor.process()
        
        # Save cleaned file
        cleaned_filename = f"cleaned_{file.filename}"
        cleaned_filepath = os.path.join(CLEANED_FOLDER, cleaned_filename)
        
        if file.filename.endswith('.csv'):
            processor.df.to_csv(cleaned_filepath, index=False)
        else:
            processor.df.to_excel(cleaned_filepath, index=False)

        return jsonify({
            "message": "File processed successfully",
            "original_filename": file.filename,
            "cleaned_filename": cleaned_filename,
            "report": {
                'rows': summary['rows_cleaned'],
                'columns': summary['columns'],
                'missing_values': summary['missing_values_before'],
                'duplicate_rows': 0  # Legacy field
            },
            "audit_trail": processor.audit_trail
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
