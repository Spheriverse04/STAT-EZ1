from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
from sklearn.impute import KNNImputer
import os
import datetime
import json

app = Flask(__name__)
CORS(app)  # Allow requests from the frontend

# Configuration for file storage
UPLOAD_FOLDER = 'uploads'
CLEANED_FOLDER = 'cleaned_files'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CLEANED_FOLDER, exist_ok=True)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file:
        # Save the original file
        original_filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(original_filepath)

        # Process the file
        try:
            if file.filename.endswith('.csv'):
                df = pd.read_csv(original_filepath)
            elif file.filename.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(original_filepath)
            else:
                return jsonify({"error": "Unsupported file type"}), 400

            # --- Data Analysis and Cleaning ---
            report, audit_trail = generate_report_and_audit(df)
            
            # Perform cleaning (example: mean imputation for all numeric columns)
            cleaned_df = df.copy()
            for col in cleaned_df.select_dtypes(include=['number']).columns:
                if cleaned_df[col].isnull().any():
                    mean_val = cleaned_df[col].mean()
                    cleaned_df[col].fillna(mean_val, inplace=True)
                    audit_trail.append(f"Imputed missing values in '{col}' with mean ({mean_val:.2f}).")


            # Save cleaned file
            cleaned_filename = f"cleaned_{file.filename}"
            cleaned_filepath = os.path.join(CLEANED_FOLDER, cleaned_filename)
            if cleaned_filename.endswith('.csv'):
                cleaned_df.to_csv(cleaned_filepath, index=False)
            else:
                cleaned_df.to_excel(cleaned_filepath, index=False)


            return jsonify({
                "message": "File processed successfully",
                "original_filename": file.filename,
                "cleaned_filename": cleaned_filename,
                "report": report,
                "audit_trail": audit_trail
            })

        except Exception as e:
            return jsonify({"error": str(e)}), 500

def generate_report_and_audit(df):
    """Generates an initial data quality report and audit trail."""
    report = {}
    audit_trail = [f"File uploaded and initial analysis started at {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}."]

    # Basic Info
    report['rows'] = len(df)
    report['columns'] = len(df.columns)
    audit_trail.append(f"File contains {report['rows']} rows and {report['columns']} columns.")

    # Missing Values
    missing_values = df.isnull().sum()
    report['missing_values'] = {col: int(val) for col, val in missing_values.items() if val > 0}
    if report['missing_values']:
        audit_trail.append(f"Detected missing values: {json.dumps(report['missing_values'])}")
    else:
        audit_trail.append("No missing values detected.")


    # Duplicate Rows
    report['duplicate_rows'] = int(df.duplicated().sum())
    if report['duplicate_rows'] > 0:
        audit_trail.append(f"Found {report['duplicate_rows']} duplicate rows.")


    # Data Types
    report['data_types'] = {col: str(dtype) for col, dtype in df.dtypes.items()}
    audit_trail.append("Data type analysis complete.")

    return report, audit_trail

@app.route('/download/<filename>')
def download_file(filename):
    return send_from_directory(CLEANED_FOLDER, filename, as_attachment=True)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
