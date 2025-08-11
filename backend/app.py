from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.impute import KNNImputer
from sklearn.preprocessing import StandardScaler
from scipy import stats
import sqlite3
import tempfile
import os
import datetime
import json
import uuid
from pathlib import Path
import plotly.graph_objects as go
import plotly.express as px
from plotly.utils import PlotlyJSONEncoder

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
        self.db_path = None
        
    def log_action(self, message):
        timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        self.audit_trail.append(f"[{timestamp}] {message}")
        
    def create_database(self):
        """Create SQLite database from DataFrame"""
        if self.db_path is None:
            # Create temporary database file
            db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
            os.close(db_fd)
        
        conn = sqlite3.connect(self.db_path)
        self.df.to_sql('dataset', conn, if_exists='replace', index=False)
        conn.close()
        self.log_action(f"Created SQLite database with {len(self.df)} rows")
        return self.db_path
        
    def execute_sql_query(self, query):
        """Execute SQL query on the dataset"""
        if self.db_path is None:
            self.create_database()
            
        try:
            conn = sqlite3.connect(self.db_path)
            result_df = pd.read_sql_query(query, conn)
            conn.close()
            self.log_action(f"Executed SQL query: {query[:100]}...")
            return result_df
        except Exception as e:
            self.log_action(f"SQL query error: {str(e)}")
            raise e
            
    def generate_visualization(self, chart_type, x_column, y_column=None, color_column=None):
        """Generate interactive visualizations using Plotly"""
        try:
            if chart_type == 'histogram':
                fig = px.histogram(self.df, x=x_column, color=color_column, 
                                 title=f'Histogram of {x_column}')
            elif chart_type == 'bar':
                if y_column:
                    fig = px.bar(self.df, x=x_column, y=y_column, color=color_column,
                               title=f'{y_column} by {x_column}')
                else:
                    value_counts = self.df[x_column].value_counts()
                    fig = px.bar(x=value_counts.index, y=value_counts.values,
                               title=f'Count of {x_column}')
            elif chart_type == 'pie':
                value_counts = self.df[x_column].value_counts()
                fig = px.pie(values=value_counts.values, names=value_counts.index,
                           title=f'Distribution of {x_column}')
            elif chart_type == 'scatter':
                if y_column:
                    fig = px.scatter(self.df, x=x_column, y=y_column, color=color_column,
                                   title=f'{y_column} vs {x_column}')
                else:
                    raise ValueError("Y column required for scatter plot")
            elif chart_type == 'line':
                if y_column:
                    fig = px.line(self.df, x=x_column, y=y_column, color=color_column,
                                title=f'{y_column} over {x_column}')
                else:
                    raise ValueError("Y column required for line chart")
            elif chart_type == 'box':
                fig = px.box(self.df, x=x_column, y=y_column, color=color_column,
                           title=f'Box Plot of {y_column} by {x_column}' if y_column else f'Box Plot of {x_column}')
            else:
                raise ValueError(f"Unsupported chart type: {chart_type}")
                
            # Convert to JSON for frontend
            return json.loads(fig.to_json())
            
        except Exception as e:
            self.log_action(f"Visualization error: {str(e)}")
            raise e
        
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
        
        # Check if user wants to delete rows with null values
        if self.config['imputation'].get('delete_null_rows', False):
            initial_rows = len(self.df)
            self.df = self.df.dropna()
            deleted_rows = initial_rows - len(self.df)
            self.log_action(f"Deleted {deleted_rows} rows containing null values")
            return missing_before, self.df.isnull().sum().to_dict()
        
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
        
    def get_data_summary(self):
        """Get comprehensive data summary for dashboard"""
        summary = {
            'total_rows': len(self.df),
            'total_columns': len(self.df.columns),
            'numeric_columns': len(self.df.select_dtypes(include=[np.number]).columns),
            'categorical_columns': len(self.df.select_dtypes(include=['object']).columns),
            'missing_values': self.df.isnull().sum().sum(),
            'duplicate_rows': self.df.duplicated().sum(),
            'memory_usage': self.df.memory_usage(deep=True).sum(),
            'column_stats': {}
        }
        
        # Get statistics for each column
        for col in self.df.columns:
            if self.df[col].dtype in ['int64', 'float64']:
                summary['column_stats'][col] = {
                    'type': 'numeric',
                    'mean': float(self.df[col].mean()) if not self.df[col].isnull().all() else None,
                    'median': float(self.df[col].median()) if not self.df[col].isnull().all() else None,
                    'std': float(self.df[col].std()) if not self.df[col].isnull().all() else None,
                    'min': float(self.df[col].min()) if not self.df[col].isnull().all() else None,
                    'max': float(self.df[col].max()) if not self.df[col].isnull().all() else None,
                    'missing_count': int(self.df[col].isnull().sum())
                }
            else:
                summary['column_stats'][col] = {
                    'type': 'categorical',
                    'unique_count': int(self.df[col].nunique()),
                    'most_frequent': str(self.df[col].mode().iloc[0]) if len(self.df[col].mode()) > 0 else None,
                    'missing_count': int(self.df[col].isnull().sum())
                }
                
        return summary
        
@app.route('/sql-query', methods=['POST'])
def execute_sql_query():
    """Execute SQL query on processed dataset"""
    try:
        data = request.get_json()
        version_id = data.get('version_id')
        query = data.get('query')
        
        if not version_id or not query:
            return jsonify({"error": "Version ID and query are required"}), 400
            
        # Find the processor instance (in a real app, you'd store these)
        # For now, we'll create a new processor with the cleaned file
        cleaned_files = [f for f in os.listdir(CLEANED_FOLDER) if version_id in f]
        if not cleaned_files:
            return jsonify({"error": "Version not found"}), 404
            
        # Load the cleaned dataset
        file_path = os.path.join(CLEANED_FOLDER, cleaned_files[0])
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
            
        processor = DataProcessor(df, {})
        result_df = processor.execute_sql_query(query)
        
        return jsonify({
            'success': True,
            'data': result_df.to_dict('records'),
            'columns': result_df.columns.tolist(),
            'row_count': len(result_df)
        })
        
    except Exception as e:
        return jsonify({"error": f"SQL query failed: {str(e)}"}), 500

@app.route('/visualize', methods=['POST'])
def create_visualization():
    """Create interactive visualization"""
    try:
        data = request.get_json()
        version_id = data.get('version_id')
        chart_type = data.get('chart_type')
        x_column = data.get('x_column')
        y_column = data.get('y_column')
        color_column = data.get('color_column')
        
        if not version_id or not chart_type or not x_column:
            return jsonify({"error": "Version ID, chart type, and X column are required"}), 400
            
        # Load the cleaned dataset
        cleaned_files = [f for f in os.listdir(CLEANED_FOLDER) if version_id in f]
        if not cleaned_files:
            return jsonify({"error": "Version not found"}), 404
            
        file_path = os.path.join(CLEANED_FOLDER, cleaned_files[0])
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
            
        processor = DataProcessor(df, {})
        chart_data = processor.generate_visualization(chart_type, x_column, y_column, color_column)
        
        return jsonify({
            'success': True,
            'chart_data': chart_data
        })
        
    except Exception as e:
        return jsonify({"error": f"Visualization failed: {str(e)}"}), 500

@app.route('/data-summary/<version_id>')
def get_data_summary(version_id):
    """Get comprehensive data summary"""
    try:
        # Load the cleaned dataset
        cleaned_files = [f for f in os.listdir(CLEANED_FOLDER) if version_id in f]
        if not cleaned_files:
            return jsonify({"error": "Version not found"}), 404
            
        file_path = os.path.join(CLEANED_FOLDER, cleaned_files[0])
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
            
        processor = DataProcessor(df, {})
        summary = processor.get_data_summary()
        
        return jsonify(summary)
        
    except Exception as e:
        return jsonify({"error": f"Failed to get data summary: {str(e)}"}), 500

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

