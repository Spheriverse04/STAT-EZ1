from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
import sqlite3
import os
import json
import uuid
import re
import tempfile
import requests
from urllib.parse import urlparse
import logging
from datetime import datetime

# Import the robust DataProcessor
from data_processor import DataProcessor

app = Flask(__name__)
CORS(app)

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Folders
UPLOAD_FOLDER = 'uploads'
CLEANED_FOLDER = 'cleaned_files'
REPORTS_FOLDER = 'reports'
CHARTS_FOLDER = 'charts'
DATABASE_FOLDER = 'databases'

for folder in [UPLOAD_FOLDER, CLEANED_FOLDER, REPORTS_FOLDER, CHARTS_FOLDER, DATABASE_FOLDER]:
    os.makedirs(folder, exist_ok=True)

# Store processed datasets in memory for SQL queries
processed_datasets = {}

class DataAnalysisDecisionEngine:
    @staticmethod
    def analyze_mixed_column(column_data, column_name):
        """Analyze a column with mixed data types and provide suggestions"""
        sample_values = column_data.dropna().head(20).tolist()
        if not sample_values:
            return None
            
        numeric_count = text_count = date_count = mixed_alphanumeric = 0
        
        for value in sample_values:
            s = str(value).strip()
            if re.match(r'^-?\d+\.?\d*$', s):
                numeric_count += 1
            elif re.match(r'\d{1,4}[-/]\d{1,2}[-/]\d{1,4}', s):
                date_count += 1
            elif re.match(r'^[A-Za-z0-9]+$', s) and any(c.isdigit() for c in s) and any(c.isalpha() for c in s):
                mixed_alphanumeric += 1
            else:
                text_count += 1
                
        total = len(sample_values)
        if total == 0:
            return None
            
        suggestions = []
        
        # Calculate ratios
        numeric_ratio = numeric_count / total
        text_ratio = text_count / total
        date_ratio = date_count / total
        mixed_ratio = mixed_alphanumeric / total
        
        if numeric_ratio > 0.8:
            suggestions.append({
                'action': 'convert_to_numeric',
                'confidence': 'high',
                'description': 'Convert to numeric',
                'reasoning': f'Mostly numeric ({numeric_ratio:.1%})'
            })
        
        if date_ratio > 0.6:
            suggestions.append({
                'action': 'convert_to_date',
                'confidence': 'high',
                'description': 'Convert to date',
                'reasoning': f'Mostly dates ({date_ratio:.1%})'
            })
            
        if mixed_ratio > 0.7:
            suggestions.append({
                'action': 'keep_as_categorical',
                'confidence': 'medium',
                'description': 'Keep as categorical',
                'reasoning': f'Alphanumeric codes ({mixed_ratio:.1%})'
            })
            
        # Always provide a safe option
        suggestions.append({
            'action': 'keep_as_text',
            'confidence': 'safe',
            'description': 'Keep as text',
            'reasoning': 'Preserve original format'
        })
        
        if mixed_alphanumeric > 0 and numeric_count > 0:
            suggestions.append({
                'action': 'split_column',
                'confidence': 'medium',
                'description': 'Split into numeric/text',
                'reasoning': 'Mixed content detected'
            })
            
        return {
            'column_name': column_name,
            'sample_values': sample_values[:10],
            'analysis': {
                'numeric_ratio': numeric_ratio,
                'text_ratio': text_ratio,
                'date_ratio': date_ratio,
                'mixed_ratio': mixed_ratio
            },
            'suggestions': suggestions
        }

def get_column_info(df):
    """Get detailed information about each column"""
    columns = []
    for col in df.columns:
        col_data = df[col]
        
        # Determine data type
        if pd.api.types.is_numeric_dtype(col_data):
            col_type = 'numeric'
        elif pd.api.types.is_datetime64_any_dtype(col_data):
            col_type = 'datetime'
        else:
            col_type = 'categorical'
            
        # Get sample values (non-null)
        sample_values = col_data.dropna().head(5).tolist()
        
        columns.append({
            'name': col,
            'type': col_type,
            'missing_count': int(col_data.isna().sum()),
            'unique_count': int(col_data.nunique()),
            'sample_values': sample_values
        })
    
    return columns

def detect_mixed_columns(df):
    """Detect columns with mixed data types"""
    mixed_columns = []
    
    for col in df.columns:
        if df[col].dtype == 'object':  # Only check object columns
            # Check if column has mixed types
            sample_data = df[col].dropna().head(50)
            if len(sample_data) > 0:
                analysis = DataAnalysisDecisionEngine.analyze_mixed_column(sample_data, col)
                if analysis and len(analysis['suggestions']) > 2:  # More than just safe options
                    mixed_columns.append(analysis)
    
    return mixed_columns

def create_sqlite_database(df, version_id):
    """Create SQLite database from DataFrame"""
    db_path = os.path.join(DATABASE_FOLDER, f"{version_id}.db")
    
    try:
        conn = sqlite3.connect(db_path)
        df.to_sql('dataset', conn, if_exists='replace', index=False)
        conn.close()
        return db_path
    except Exception as e:
        logger.error(f"Failed to create database: {e}")
        return None

# ================= ROUTES ================= #

@app.route('/preview', methods=['POST'])
@app.route('/api/preview', methods=['POST'])
def preview_data():
    """Preview uploaded data and analyze its structure"""
    try:
        temp_path = request.form.get('temp_path')
        filename = request.form.get('filename', 'dataset.csv')

        # Handle file upload or temp path
        if temp_path and os.path.exists(temp_path):
            if filename.endswith('.csv'):
                df = pd.read_csv(temp_path, nrows=1000)
            else:
                df = pd.read_excel(temp_path, nrows=1000)
        elif 'file' in request.files:
            file = request.files['file']
            if not file or file.filename == '':
                return jsonify({"error": "No file provided"}), 400
                
            filename = file.filename
            if filename.endswith('.csv'):
                df = pd.read_csv(file, nrows=1000)
            elif filename.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(file, nrows=1000)
            else:
                return jsonify({"error": "Unsupported file type. Please upload CSV or Excel files."}), 400
        else:
            return jsonify({"error": "No file or temp_path provided"}), 400

        # Get column information
        columns = get_column_info(df)
        
        # Detect mixed columns
        mixed_columns = detect_mixed_columns(df)
        
        # Calculate data quality score
        total_cells = len(df) * len(df.columns)
        missing_cells = df.isna().sum().sum()
        data_quality_score = ((total_cells - missing_cells) / total_cells * 100) if total_cells > 0 else 100

        return jsonify({
            'columns': columns,
            'mixed_columns': mixed_columns,
            'sample_rows': df.head(10).fillna('').to_dict('records'),
            'total_rows': len(df),
            'requires_decisions': len(mixed_columns) > 0,
            'data_quality_score': round(data_quality_score, 1),
            'recommendations': [
                f"Dataset has {len(df)} rows and {len(df.columns)} columns",
                f"Data completeness: {data_quality_score:.1f}%",
                f"Mixed data types detected in {len(mixed_columns)} columns" if mixed_columns else "No mixed data types detected"
            ]
        })
        
    except Exception as e:
        logger.error(f"Preview failed: {e}")
        return jsonify({"error": f"Failed to preview file: {str(e)}"}), 500

@app.route('/download-from-url', methods=['POST'])
@app.route('/api/download-from-url', methods=['POST'])
def download_from_url():
    """Download dataset from URL"""
    try:
        data = request.get_json()
        url = data.get('url')
        
        if not url:
            return jsonify({"error": "URL is required"}), 400
            
        # Validate URL
        parsed_url = urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
            return jsonify({"error": "Invalid URL format"}), 400
            
        # Download file
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        # Determine filename from URL or content-disposition
        filename = os.path.basename(parsed_url.path)
        if not filename or '.' not in filename:
            content_disposition = response.headers.get('content-disposition', '')
            if 'filename=' in content_disposition:
                filename = content_disposition.split('filename=')[1].strip('"')
            else:
                filename = 'dataset.csv'
                
        # Save to temporary file
        temp_path = os.path.join(UPLOAD_FOLDER, f"temp_{uuid.uuid4().hex}_{filename}")
        with open(temp_path, 'wb') as f:
            f.write(response.content)
            
        return jsonify({
            "success": True,
            "temp_path": temp_path,
            "filename": filename,
            "size": len(response.content)
        })
        
    except requests.RequestException as e:
        return jsonify({"error": f"Failed to download file: {str(e)}"}), 400
    except Exception as e:
        logger.error(f"URL download failed: {e}")
        return jsonify({"error": f"Download failed: {str(e)}"}), 500

@app.route('/process-with-decisions', methods=['POST'])
@app.route('/api/process-with-decisions', methods=['POST'])
def process_with_decisions():
    """Process dataset with user decisions and configuration"""
    try:
        temp_path = request.form.get('temp_path')
        config = json.loads(request.form.get('config', '{}'))
        column_decisions = json.loads(request.form.get('column_decisions', '{}'))
        filename = request.form.get('filename', 'dataset.csv')

        # Load the dataset
        if temp_path and os.path.exists(temp_path):
            if filename.endswith('.csv'):
                df = pd.read_csv(temp_path)
            else:
                df = pd.read_excel(temp_path)
        elif 'file' in request.files:
            file = request.files['file']
            filename = file.filename
            if filename.endswith('.csv'):
                df = pd.read_csv(file)
            else:
                df = pd.read_excel(file)
        else:
            return jsonify({"error": "No file provided"}), 400

        # Process the data using the robust DataProcessor
        processor = DataProcessor(df, config, column_decisions, logger)
        
        # Process and save results
        result = processor.process(CLEANED_FOLDER, REPORTS_FOLDER)
        
        # Create SQLite database for SQL queries
        version_id = str(uuid.uuid4())
        db_path = create_sqlite_database(processor.df, version_id)
        
        # Store processed dataset in memory for quick access
        processed_datasets[version_id] = {
            'dataframe': processor.df,
            'db_path': db_path,
            'columns': list(processor.df.columns),
            'filename': filename
        }
        
        # Generate summary
        summary = processor.generate_summary()
        
        # Clean up temporary file
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass

        return jsonify({
            'version_id': version_id,
            'original_filename': filename,
            'cleaned_filename': os.path.basename(result['cleaned_path']),
            'summary': summary,
            'audit_trail': result['logs'],
            'download_url': f'/api/download/{os.path.basename(result["cleaned_path"])}',
            'report_url': f'/api/download-report/{os.path.basename(result["report_path"])}' if result['report_path'] else None,
            'charts_generated': 0
        })
        
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500

@app.route('/sql-query', methods=['POST'])
@app.route('/api/sql-query', methods=['POST'])
def execute_sql_query():
    """Execute SQL query on processed dataset"""
    try:
        data = request.get_json()
        version_id = data.get('version_id')
        query = data.get('query', '').strip()
        
        if not version_id or not query:
            return jsonify({"error": "version_id and query are required"}), 400
            
        if version_id not in processed_datasets:
            return jsonify({"error": "Dataset not found. Please process a dataset first."}), 404
            
        dataset_info = processed_datasets[version_id]
        db_path = dataset_info['db_path']
        
        if not db_path or not os.path.exists(db_path):
            return jsonify({"error": "Database not available for this dataset"}), 404
            
        # Basic SQL injection protection
        dangerous_keywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE']
        query_upper = query.upper()
        for keyword in dangerous_keywords:
            if keyword in query_upper:
                return jsonify({"error": f"'{keyword}' operations are not allowed"}), 400
                
        # Execute query
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row  # Enable column access by name
        cursor = conn.cursor()
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        # Convert to list of dictionaries
        columns = [description[0] for description in cursor.description] if cursor.description else []
        data_rows = [dict(row) for row in rows]
        
        conn.close()
        
        return jsonify({
            "success": True,
            "data": data_rows,
            "columns": columns,
            "row_count": len(data_rows)
        })
        
    except sqlite3.Error as e:
        return jsonify({"error": f"SQL Error: {str(e)}"}), 400
    except Exception as e:
        logger.error(f"SQL query failed: {e}")
        return jsonify({"error": f"Query execution failed: {str(e)}"}), 500

@app.route('/visualize', methods=['POST'])
@app.route('/api/visualize', methods=['POST'])
def create_visualization():
    """Create visualization from processed dataset"""
    try:
        data = request.get_json()
        version_id = data.get('version_id')
        chart_type = data.get('chart_type', 'histogram')
        x_column = data.get('x_column')
        y_column = data.get('y_column')
        color_column = data.get('color_column')
        
        if not version_id or not x_column:
            return jsonify({"error": "version_id and x_column are required"}), 400
            
        if version_id not in processed_datasets:
            return jsonify({"error": "Dataset not found"}), 404
            
        df = processed_datasets[version_id]['dataframe']
        
        if x_column not in df.columns:
            return jsonify({"error": f"Column '{x_column}' not found"}), 400
            
        # Generate chart data based on type
        chart_data = generate_chart_data(df, chart_type, x_column, y_column, color_column)
        
        return jsonify({
            "success": True,
            "chart_data": chart_data
        })
        
    except Exception as e:
        logger.error(f"Visualization failed: {e}")
        return jsonify({"error": f"Visualization failed: {str(e)}"}), 500

def generate_chart_data(df, chart_type, x_column, y_column=None, color_column=None):
    """Generate Plotly chart data"""
    try:
        if chart_type == 'histogram':
            data = [{
                'x': df[x_column].dropna().tolist(),
                'type': 'histogram',
                'name': x_column
            }]
            layout = {
                'title': f'Distribution of {x_column}',
                'xaxis': {'title': x_column},
                'yaxis': {'title': 'Frequency'}
            }
            
        elif chart_type == 'bar':
            if y_column:
                # Grouped bar chart
                grouped = df.groupby(x_column)[y_column].mean().reset_index()
                data = [{
                    'x': grouped[x_column].tolist(),
                    'y': grouped[y_column].tolist(),
                    'type': 'bar',
                    'name': f'Average {y_column}'
                }]
            else:
                # Count bar chart
                counts = df[x_column].value_counts().head(20)
                data = [{
                    'x': counts.index.tolist(),
                    'y': counts.values.tolist(),
                    'type': 'bar',
                    'name': 'Count'
                }]
            layout = {
                'title': f'{x_column} Distribution',
                'xaxis': {'title': x_column},
                'yaxis': {'title': y_column if y_column else 'Count'}
            }
            
        elif chart_type == 'scatter':
            if not y_column:
                return {"error": "Y column required for scatter plot"}
            data = [{
                'x': df[x_column].tolist(),
                'y': df[y_column].tolist(),
                'mode': 'markers',
                'type': 'scatter',
                'name': f'{x_column} vs {y_column}'
            }]
            layout = {
                'title': f'{x_column} vs {y_column}',
                'xaxis': {'title': x_column},
                'yaxis': {'title': y_column}
            }
            
        elif chart_type == 'pie':
            counts = df[x_column].value_counts().head(10)
            data = [{
                'labels': counts.index.tolist(),
                'values': counts.values.tolist(),
                'type': 'pie'
            }]
            layout = {
                'title': f'{x_column} Distribution'
            }
            
        else:
            return {"error": f"Unsupported chart type: {chart_type}"}
            
        return {'data': data, 'layout': layout}
        
    except Exception as e:
        return {"error": f"Chart generation failed: {str(e)}"}

@app.route('/download/<filename>')
@app.route('/api/download/<filename>')
def download_file(filename):
    """Download cleaned dataset file"""
    try:
        return send_from_directory(CLEANED_FOLDER, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

@app.route('/download-report/<filename>')
@app.route('/api/download-report/<filename>')
def download_report(filename):
    """Download analysis report"""
    try:
        return send_from_directory(REPORTS_FOLDER, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "Report not found"}), 404

@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "processed_datasets": len(processed_datasets)
    })

@app.route('/export/<version_id>', methods=['POST'])
@app.route('/api/export/<version_id>', methods=['POST'])
def export_dataset():
    """Export processed dataset in various formats"""
    try:
        data = request.get_json()
        export_format = data.get('format', 'csv')
        filename = data.get('filename', 'dataset')
        options = data.get('options', {})
        
        if version_id not in processed_datasets:
            return jsonify({"error": "Dataset not found"}), 404
            
        df = processed_datasets[version_id]['dataframe']
        
        if export_format == 'csv':
            output = df.to_csv(index=False)
            mimetype = 'text/csv'
            file_extension = 'csv'
        elif export_format == 'json':
            output = df.to_json(orient='records', indent=2)
            mimetype = 'application/json'
            file_extension = 'json'
        elif export_format == 'excel':
            # For Excel export, we'd need to create a BytesIO buffer
            from io import BytesIO
            output_buffer = BytesIO()
            with pd.ExcelWriter(output_buffer, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Cleaned_Data', index=False)
                # Add metadata sheet if requested
                if options.get('include_metadata', False):
                    metadata_df = pd.DataFrame({
                        'Property': ['Rows', 'Columns', 'Export_Date'],
                        'Value': [len(df), len(df.columns), datetime.utcnow().isoformat()]
                    })
                    metadata_df.to_excel(writer, sheet_name='Metadata', index=False)
            output_buffer.seek(0)
            
            return send_file(
                output_buffer,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                as_attachment=True,
                download_name=f"{filename}_export.xlsx"
            )
        else:
            return jsonify({"error": f"Unsupported export format: {export_format}"}), 400
            
        # For CSV and JSON, return as text response
        response = make_response(output)
        response.headers['Content-Type'] = mimetype
        response.headers['Content-Disposition'] = f'attachment; filename="{filename}_export.{file_extension}"'
        
        return response
        
    except Exception as e:
        logger.error(f"Export failed: {e}")
        return jsonify({"error": f"Export failed: {str(e)}"}), 500

@app.route('/api/data-quality/<version_id>', methods=['GET'])
def get_data_quality_metrics():
    """Get comprehensive data quality metrics"""
    try:
        if version_id not in processed_datasets:
            return jsonify({"error": "Dataset not found"}), 404
            
        df = processed_datasets[version_id]['dataframe']
        
        # Calculate quality metrics
        total_cells = len(df) * len(df.columns)
        missing_cells = df.isna().sum().sum()
        completeness_score = ((total_cells - missing_cells) / total_cells * 100) if total_cells > 0 else 100
        
        # Detect duplicates
        duplicate_rows = df.duplicated().sum()
        uniqueness_score = ((len(df) - duplicate_rows) / len(df) * 100) if len(df) > 0 else 100
        
        # Basic consistency check (placeholder)
        consistency_score = 85.0  # Would implement actual consistency checks
        
        # Basic validity check (placeholder)
        validity_score = 90.0  # Would implement actual validity checks
        
        overall_score = (completeness_score + consistency_score + validity_score + uniqueness_score) / 4
        
        # Generate issues
        issues = []
        if missing_cells > 0:
            issues.append({
                'type': 'missing_data',
                'severity': 'high' if completeness_score < 80 else 'medium' if completeness_score < 95 else 'low',
                'description': f'{missing_cells} missing values detected across the dataset',
                'affected_columns': df.columns[df.isna().any()].tolist(),
                'recommendation': 'Consider imputation strategies or removal of incomplete records'
            })
            
        if duplicate_rows > 0:
            issues.append({
                'type': 'duplicates',
                'severity': 'medium',
                'description': f'{duplicate_rows} duplicate rows found',
                'affected_columns': list(df.columns),
                'recommendation': 'Review and remove duplicate records to ensure data integrity'
            })
        
        metrics = {
            'completeness_score': completeness_score,
            'consistency_score': consistency_score,
            'validity_score': validity_score,
            'uniqueness_score': uniqueness_score,
            'overall_score': overall_score,
            'issues': issues
        }
        
        return jsonify(metrics)
        
    except Exception as e:
        logger.error(f"Quality metrics calculation failed: {e}")
        return jsonify({"error": f"Quality assessment failed: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001, host='0.0.0.0')

