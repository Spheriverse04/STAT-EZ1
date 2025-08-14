from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.impute import KNNImputer
from scipy import stats
import sqlite3
import os
import json
import uuid
import re

app = Flask(__name__)
CORS(app)

# Folders
UPLOAD_FOLDER = 'uploads'
CLEANED_FOLDER = 'cleaned_files'
REPORTS_FOLDER = 'reports'
CHARTS_FOLDER = 'charts'
for folder in [UPLOAD_FOLDER, CLEANED_FOLDER, REPORTS_FOLDER, CHARTS_FOLDER]:
    os.makedirs(folder, exist_ok=True)

class DataAnalysisDecisionEngine:
    @staticmethod
    def analyze_mixed_column(column_data, column_name):
        sample_values = column_data.dropna().head(20).tolist()
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
        if numeric_count / total > 0.8:
            suggestions.append({'action': 'convert_to_numeric', 'confidence': 'high', 'description': 'Convert to numeric', 'reasoning': 'Mostly numeric'})
        if date_count / total > 0.6:
            suggestions.append({'action': 'convert_to_date', 'confidence': 'high', 'description': 'Convert to date', 'reasoning': 'Mostly dates'})
        if mixed_alphanumeric / total > 0.7:
            suggestions.append({'action': 'keep_as_categorical', 'confidence': 'medium', 'description': 'Keep as categorical', 'reasoning': 'Alphanumeric codes'})
        suggestions.append({'action': 'keep_as_text', 'confidence': 'safe', 'description': 'Keep as text', 'reasoning': 'Preserve original format'})
        if mixed_alphanumeric > 0 and numeric_count > 0:
            suggestions.append({'action': 'split_column', 'confidence': 'medium', 'description': 'Split into numeric/text', 'reasoning': 'Mixed content'})
        return {'column_name': column_name, 'sample_values': sample_values[:10], 'analysis': {}, 'suggestions': suggestions}

class DataProcessor:
    def __init__(self, df, config):
        self.df = df.copy()
        self.original_df = df.copy()

        # Default-safe config
        defaults = {
            'imputation': {'method': 'mean', 'delete_null_rows': False, 'column_specific': {}},
            'outlier_detection': {'enabled': False, 'method': 'iqr', 'threshold': 1.5, 'action': 'flag'},
            'rules': {'enabled': False, 'custom_rules': []},
            'schema_mapping': {}
        }
        merged = defaults.copy()
        for k, v in defaults.items():
            if k in config and isinstance(config[k], dict):
                merged[k] = {**v, **config[k]}
        self.config = merged

        self.audit_trail = []
        self.version_id = str(uuid.uuid4())
        self.db_path = None
        self.mixed_columns_decisions = {}
        self.charts_generated = []

    # Placeholder for actual implementations
    def get_column_info(self, df):
        return [{"name": col, "dtype": str(df[col].dtype)} for col in df.columns]

    def detect_mixed_columns(self):
        return []

    def apply_column_decisions(self, decisions):
        pass

    def process(self):
        return {"rows": len(self.df), "columns": list(self.df.columns)}

    def generate_pdf_report(self):
        report_path = os.path.join(REPORTS_FOLDER, f"{self.version_id}.pdf")
        with open(report_path, "w") as f:
            f.write("Report content")
        return report_path

# ================= ROUTES ================= #

@app.route('/preview', methods=['POST'])
@app.route('/api/preview', methods=['POST'])
def preview_data():
    try:
        temp_path = request.form.get('temp_path')

        # Improved file validation
        if not temp_path and 'file' not in request.files:
            return jsonify({"error": "No file or temp_path provided. If testing with curl, use file=@path.csv"}), 400

        if temp_path and os.path.exists(temp_path):
            filename = request.form.get('filename', 'dataset.csv')
            df = pd.read_csv(temp_path, nrows=1000) if filename.endswith('.csv') else pd.read_excel(temp_path, nrows=1000)
        else:
            file = request.files.get('file')
            if file.filename == '':
                return jsonify({"error": "Empty filename received — check frontend FormData"}), 400
            filename = file.filename
            if filename.endswith('.csv'):
                df = pd.read_csv(file, nrows=1000)
            elif filename.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(file, nrows=1000)
            else:
                return jsonify({"error": "Unsupported file type"}), 400

        processor = DataProcessor(df, {})
        columns = processor.get_column_info(df)
        mixed_columns = processor.detect_mixed_columns()

        return jsonify({
            'columns': columns,
            'mixed_columns': mixed_columns,
            'sample_rows': df.head(10).fillna('').to_dict('records'),
            'total_rows': len(df),
            'requires_decisions': len(mixed_columns) > 0
        })
    except Exception as e:
        return jsonify({"error": f"Failed to preview file: {str(e)}"}), 500

@app.route('/process-with-decisions', methods=['POST'])
@app.route('/api/process-with-decisions', methods=['POST'])
def process_with_decisions():
    try:
        temp_path = request.form.get('temp_path')
        config = json.loads(request.form.get('config', '{}'))
        column_decisions = json.loads(request.form.get('column_decisions', '{}'))

        if temp_path and os.path.exists(temp_path):
            filename = request.form.get('filename', 'dataset.csv')
            df = pd.read_csv(temp_path) if filename.endswith('.csv') else pd.read_excel(temp_path)
        elif 'file' in request.files:
            file = request.files['file']
            filename = file.filename
            df = pd.read_csv(file) if filename.endswith('.csv') else pd.read_excel(file)
        else:
            return jsonify({"error": "No file provided"}), 400

        processor = DataProcessor(df, config)
        if column_decisions:
            processor.apply_column_decisions(column_decisions)
        summary = processor.process()
        report_path = processor.generate_pdf_report()

        cleaned_filename = f"cleaned_{processor.version_id}_{filename}"
        cleaned_filepath = os.path.join(CLEANED_FOLDER, cleaned_filename)
        if filename.endswith('.csv'):
            processor.df.to_csv(cleaned_filepath, index=False)
        else:
            processor.df.to_excel(cleaned_filepath, index=False)

        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

        return jsonify({
            'version_id': processor.version_id,
            'original_filename': filename,
            'cleaned_filename': cleaned_filename,
            'summary': summary,
            'audit_trail': processor.audit_trail,
            'download_url': f'/download/{cleaned_filename}',
            'report_url': f'/download-report/{os.path.basename(report_path)}',
            'charts_generated': len(processor.charts_generated)
        })
    except Exception as e:
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500

@app.route('/download/<filename>')
@app.route('/api/download/<filename>')
def download_file(filename):
    try:
        return send_from_directory(CLEANED_FOLDER, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

@app.route('/download-report/<filename>')
@app.route('/api/download-report/<filename>')
def download_report(filename):
    try:
        return send_from_directory(REPORTS_FOLDER, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "Report not found"}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)

