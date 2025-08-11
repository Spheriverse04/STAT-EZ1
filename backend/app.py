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
import requests
from urllib.parse import urlparse
import re
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
from matplotlib.backends.backend_agg import FigureCanvasAgg

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
CLEANED_FOLDER = 'cleaned_files'
REPORTS_FOLDER = 'reports'
CHARTS_FOLDER = 'charts'

for folder in [UPLOAD_FOLDER, CLEANED_FOLDER, REPORTS_FOLDER, CHARTS_FOLDER]:
    os.makedirs(folder, exist_ok=True)

class DataAnalysisDecisionEngine:
    """AI-like decision engine for data analysis choices"""
    
    @staticmethod
    def analyze_mixed_column(column_data, column_name):
        """Analyze columns with mixed data types and suggest actions"""
        sample_values = column_data.dropna().head(20).tolist()
        
        # Count different data types
        numeric_count = 0
        text_count = 0
        date_count = 0
        mixed_alphanumeric = 0
        
        for value in sample_values:
            str_val = str(value).strip()
            
            # Check if it's purely numeric
            if re.match(r'^-?\d+\.?\d*$', str_val):
                numeric_count += 1
            # Check if it's a date
            elif re.match(r'\d{1,4}[-/]\d{1,2}[-/]\d{1,4}', str_val):
                date_count += 1
            # Check if it's mixed alphanumeric (like product codes)
            elif re.match(r'^[A-Za-z0-9]+$', str_val) and any(c.isdigit() for c in str_val) and any(c.isalpha() for c in str_val):
                mixed_alphanumeric += 1
            else:
                text_count += 1
        
        total_samples = len(sample_values)
        if total_samples == 0:
            return None
            
        # Generate suggestions based on analysis
        suggestions = []
        
        if numeric_count / total_samples > 0.8:
            suggestions.append({
                'action': 'convert_to_numeric',
                'confidence': 'high',
                'description': f'Convert to numeric ({numeric_count}/{total_samples} values are numeric)',
                'reasoning': 'Most values appear to be numeric with some text entries that might be data entry errors'
            })
            
        if date_count / total_samples > 0.6:
            suggestions.append({
                'action': 'convert_to_date',
                'confidence': 'high',
                'description': f'Convert to date format ({date_count}/{total_samples} values are dates)',
                'reasoning': 'Most values appear to be dates'
            })
            
        if mixed_alphanumeric / total_samples > 0.7:
            suggestions.append({
                'action': 'keep_as_categorical',
                'confidence': 'medium',
                'description': f'Keep as categorical ({mixed_alphanumeric}/{total_samples} are alphanumeric codes)',
                'reasoning': 'Values appear to be product codes, IDs, or similar categorical identifiers'
            })
            
        # Always provide option to keep as text
        suggestions.append({
            'action': 'keep_as_text',
            'confidence': 'safe',
            'description': 'Keep as text/categorical',
            'reasoning': 'Preserve original format without conversion'
        })
        
        # Option to split column
        if mixed_alphanumeric > 0 and numeric_count > 0:
            suggestions.append({
                'action': 'split_column',
                'confidence': 'medium',
                'description': 'Split into separate numeric and text columns',
                'reasoning': 'Column contains both meaningful numeric and text components'
            })
        
        return {
            'column_name': column_name,
            'sample_values': sample_values[:10],
            'analysis': {
                'numeric_ratio': numeric_count / total_samples,
                'text_ratio': text_count / total_samples,
                'date_ratio': date_count / total_samples,
                'mixed_ratio': mixed_alphanumeric / total_samples
            },
            'suggestions': suggestions
        }
class DataProcessor:
    def __init__(self, df, config):
        self.df = df.copy()
        self.original_df = df.copy()
        self.config = config
        self.audit_trail = []
        self.version_id = str(uuid.uuid4())
        self.db_path = None
        self.mixed_columns_decisions = {}
        self.charts_generated = []
        
    def log_action(self, message):
        timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        self.audit_trail.append(f"[{timestamp}] {message}")
        
    def detect_mixed_columns(self):
        """Detect columns with mixed data types that need user decisions"""
        mixed_columns = []
        
        for col in self.df.columns:
            if self.df[col].dtype == 'object':  # Text columns
                # Check if column has mixed numeric and text data
                sample_data = self.df[col].dropna().head(50)
                if len(sample_data) > 0:
                    analysis = DataAnalysisDecisionEngine.analyze_mixed_column(sample_data, col)
                    if analysis and len(analysis['suggestions']) > 1:
                        mixed_columns.append(analysis)
        
        return mixed_columns
        
    def apply_column_decisions(self, decisions):
        """Apply user decisions for mixed columns"""
        for column_name, decision in decisions.items():
            if column_name not in self.df.columns:
                continue
                
            action = decision['action']
            
            try:
                if action == 'convert_to_numeric':
                    # Convert to numeric, coercing errors to NaN
                    self.df[column_name] = pd.to_numeric(self.df[column_name], errors='coerce')
                    self.log_action(f"Converted {column_name} to numeric type")
                    
                elif action == 'convert_to_date':
                    # Convert to datetime
                    self.df[column_name] = pd.to_datetime(self.df[column_name], errors='coerce')
                    self.log_action(f"Converted {column_name} to datetime type")
                    
                elif action == 'split_column':
                    # Split into numeric and text parts
                    numeric_part = self.df[column_name].str.extract(r'(\d+\.?\d*)', expand=False)
                    text_part = self.df[column_name].str.extract(r'([A-Za-z]+)', expand=False)
                    
                    self.df[f"{column_name}_numeric"] = pd.to_numeric(numeric_part, errors='coerce')
                    self.df[f"{column_name}_text"] = text_part
                    
                    # Optionally drop original column
                    if decision.get('drop_original', False):
                        self.df.drop(columns=[column_name], inplace=True)
                        
                    self.log_action(f"Split {column_name} into numeric and text components")
                    
                # 'keep_as_text' and 'keep_as_categorical' don't require changes
                elif action in ['keep_as_text', 'keep_as_categorical']:
                    self.log_action(f"Kept {column_name} as {action.replace('_', ' ')}")
                    
            except Exception as e:
                self.log_action(f"Error processing {column_name}: {str(e)}")
        
        self.mixed_columns_decisions = decisions
        
    def generate_comprehensive_charts(self):
        """Generate comprehensive charts for the dataset"""
        charts = []
        
        # Set style for better looking charts
        plt.style.use('seaborn-v0_8')
        
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        categorical_cols = self.df.select_dtypes(include=['object']).columns
        
        # 1. Dataset Overview Chart
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle('Dataset Overview', fontsize=16, fontweight='bold')
        
        # Missing values heatmap
        if self.df.isnull().sum().sum() > 0:
            missing_data = self.df.isnull().sum()
            missing_data = missing_data[missing_data > 0]
            if len(missing_data) > 0:
                ax1.bar(range(len(missing_data)), missing_data.values)
                ax1.set_xticks(range(len(missing_data)))
                ax1.set_xticklabels(missing_data.index, rotation=45, ha='right')
                ax1.set_title('Missing Values by Column')
                ax1.set_ylabel('Count')
        else:
            ax1.text(0.5, 0.5, 'No Missing Values', ha='center', va='center', transform=ax1.transAxes)
            ax1.set_title('Missing Values by Column')
        
        # Data types distribution
        dtype_counts = {'Numeric': len(numeric_cols), 'Categorical': len(categorical_cols)}
        ax2.pie(dtype_counts.values(), labels=dtype_counts.keys(), autopct='%1.1f%%')
        ax2.set_title('Data Types Distribution')
        
        # Dataset size info
        size_info = [len(self.df), len(self.df.columns), self.df.memory_usage(deep=True).sum()]
        size_labels = ['Rows', 'Columns', 'Memory (bytes)']
        bars = ax3.bar(size_labels, size_info)
        ax3.set_title('Dataset Dimensions')
        ax3.set_ylabel('Count')
        
        # Add value labels on bars
        for bar, value in zip(bars, size_info):
            height = bar.get_height()
            ax3.text(bar.get_x() + bar.get_width()/2., height,
                    f'{value:,}', ha='center', va='bottom')
        
        # Correlation heatmap for numeric columns
        if len(numeric_cols) > 1:
            corr_matrix = self.df[numeric_cols].corr()
            im = ax4.imshow(corr_matrix, cmap='coolwarm', aspect='auto')
            ax4.set_xticks(range(len(numeric_cols)))
            ax4.set_yticks(range(len(numeric_cols)))
            ax4.set_xticklabels(numeric_cols, rotation=45, ha='right')
            ax4.set_yticklabels(numeric_cols)
            ax4.set_title('Correlation Matrix')
            
            # Add correlation values
            for i in range(len(numeric_cols)):
                for j in range(len(numeric_cols)):
                    text = ax4.text(j, i, f'{corr_matrix.iloc[i, j]:.2f}',
                                  ha="center", va="center", color="black", fontsize=8)
        else:
            ax4.text(0.5, 0.5, 'Insufficient numeric\ncolumns for correlation', 
                    ha='center', va='center', transform=ax4.transAxes)
            ax4.set_title('Correlation Matrix')
        
        plt.tight_layout()
        overview_path = os.path.join(CHARTS_FOLDER, f'overview_{self.version_id}.png')
        plt.savefig(overview_path, dpi=300, bbox_inches='tight')
        plt.close()
        charts.append(('Dataset Overview', overview_path))
        
        # 2. Individual column distributions
        for col in numeric_cols[:6]:  # Limit to first 6 numeric columns
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
            fig.suptitle(f'Distribution Analysis: {col}', fontsize=14, fontweight='bold')
            
            # Histogram
            self.df[col].hist(bins=30, ax=ax1, alpha=0.7, color='skyblue', edgecolor='black')
            ax1.set_title('Histogram')
            ax1.set_xlabel(col)
            ax1.set_ylabel('Frequency')
            
            # Box plot
            self.df[col].plot(kind='box', ax=ax2, color='lightgreen')
            ax2.set_title('Box Plot')
            ax2.set_ylabel(col)
            
            plt.tight_layout()
            dist_path = os.path.join(CHARTS_FOLDER, f'distribution_{col}_{self.version_id}.png')
            plt.savefig(dist_path, dpi=300, bbox_inches='tight')
            plt.close()
            charts.append((f'Distribution: {col}', dist_path))
        
        # 3. Categorical analysis
        for col in categorical_cols[:4]:  # Limit to first 4 categorical columns
            if self.df[col].nunique() <= 20:  # Only for columns with reasonable number of categories
                fig, ax = plt.subplots(figsize=(10, 6))
                
                value_counts = self.df[col].value_counts().head(10)
                bars = ax.bar(range(len(value_counts)), value_counts.values, color='lightcoral')
                ax.set_xticks(range(len(value_counts)))
                ax.set_xticklabels(value_counts.index, rotation=45, ha='right')
                ax.set_title(f'Top Categories: {col}')
                ax.set_ylabel('Count')
                
                # Add value labels on bars
                for bar, value in zip(bars, value_counts.values):
                    height = bar.get_height()
                    ax.text(bar.get_x() + bar.get_width()/2., height,
                           f'{value}', ha='center', va='bottom')
                
                plt.tight_layout()
                cat_path = os.path.join(CHARTS_FOLDER, f'categorical_{col}_{self.version_id}.png')
                plt.savefig(cat_path, dpi=300, bbox_inches='tight')
                plt.close()
                charts.append((f'Categories: {col}', cat_path))
        
        self.charts_generated = charts
        self.log_action(f"Generated {len(charts)} comprehensive charts")
        return charts
        
    def generate_pdf_report(self):
        """Generate comprehensive PDF report"""
        report_filename = f"analysis_report_{self.version_id}.pdf"
        report_path = os.path.join(REPORTS_FOLDER, report_filename)
        
        # Create PDF document
        doc = SimpleDocTemplate(report_path, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.darkblue,
            alignment=1  # Center alignment
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            spaceAfter=12,
            textColor=colors.darkblue
        )
        
        # Title page
        story.append(Paragraph("STAT-EZ Data Analysis Report", title_style))
        story.append(Spacer(1, 20))
        story.append(Paragraph(f"Dataset Analysis Report", styles['Heading2']))
        story.append(Paragraph(f"Generated on: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
        story.append(Paragraph(f"Version ID: {self.version_id}", styles['Normal']))
        story.append(PageBreak())
        
        # Executive Summary
        story.append(Paragraph("Executive Summary", heading_style))
        
        summary_data = [
            ['Metric', 'Value'],
            ['Total Rows', f"{len(self.df):,}"],
            ['Total Columns', f"{len(self.df.columns)}"],
            ['Numeric Columns', f"{len(self.df.select_dtypes(include=[np.number]).columns)}"],
            ['Categorical Columns', f"{len(self.df.select_dtypes(include=['object']).columns)}"],
            ['Missing Values', f"{self.df.isnull().sum().sum():,}"],
            ['Duplicate Rows', f"{self.df.duplicated().sum():,}"],
            ['Memory Usage', f"{self.df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB"]
        ]
        
        summary_table = Table(summary_data)
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(summary_table)
        story.append(Spacer(1, 20))
        
        # Data Quality Assessment
        story.append(Paragraph("Data Quality Assessment", heading_style))
        
        quality_score = ((len(self.df) * len(self.df.columns) - self.df.isnull().sum().sum()) / 
                        (len(self.df) * len(self.df.columns))) * 100
        
        story.append(Paragraph(f"Overall Data Quality Score: {quality_score:.1f}%", styles['Normal']))
        story.append(Spacer(1, 12))
        
        # Processing Summary
        if hasattr(self, 'processing_summary'):
            story.append(Paragraph("Processing Summary", heading_style))
            
            processing_data = [
                ['Processing Step', 'Result'],
                ['Original Rows', f"{self.processing_summary.get('rows_original', 'N/A'):,}"],
                ['Cleaned Rows', f"{self.processing_summary.get('rows_cleaned', len(self.df)):,}"],
                ['Outliers Detected', f"{self.processing_summary.get('outliers_detected', 0)}"],
                ['Rules Applied', f"{self.processing_summary.get('rules_applied', 0)}"],
                ['Missing Values Fixed', f"{sum(self.processing_summary.get('missing_values_before', {}).values()) - sum(self.processing_summary.get('missing_values_after', {}).values())}"]
            ]
            
            processing_table = Table(processing_data)
            processing_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(processing_table)
            story.append(Spacer(1, 20))
        
        # Add charts
        if self.charts_generated:
            story.append(PageBreak())
            story.append(Paragraph("Data Visualizations", heading_style))
            
            for chart_title, chart_path in self.charts_generated:
                if os.path.exists(chart_path):
                    story.append(Paragraph(chart_title, styles['Heading3']))
                    story.append(Spacer(1, 12))
                    
                    # Add image
                    img = Image(chart_path, width=6*inch, height=4*inch)
                    story.append(img)
                    story.append(Spacer(1, 20))
        
        # Audit Trail
        story.append(PageBreak())
        story.append(Paragraph("Processing Audit Trail", heading_style))
        
        for entry in self.audit_trail:
            story.append(Paragraph(f"• {entry}", styles['Normal']))
        
        # Build PDF
        doc.build(story)
        self.log_action(f"Generated comprehensive PDF report: {report_filename}")
        
        return report_path
        
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
        
    def process(self):
        """Main processing pipeline with enhanced analysis"""
        self.log_action(f"Started processing with version ID: {self.version_id}")
        
        # Store original stats
        original_rows = len(self.original_df)
        original_cols = len(self.original_df.columns)
        
        # Apply schema mapping first
        self.apply_schema_mapping()
        
        # Apply column decisions for mixed data types
        if self.mixed_columns_decisions:
            self.apply_column_decisions(self.mixed_columns_decisions)
        
        # Handle missing values
        missing_before, missing_after = self.handle_missing_values()
        
        # Detect outliers
        outliers_detected = self.detect_outliers()
        
        # Apply custom rules
        rules_applied = self.apply_rules()
        
        # Generate comprehensive charts
        self.generate_comprehensive_charts()
        
        # Final stats
        final_rows = len(self.df)
        final_cols = len(self.df.columns)
        
        self.processing_summary = {
            'rows_original': original_rows,
            'rows_cleaned': final_rows,
            'columns': final_cols,
            'missing_values_before': {k: int(v) for k, v in missing_before.items() if v > 0},
            'missing_values_after': {k: int(v) for k, v in missing_after.items() if v > 0},
            'outliers_detected': int(outliers_detected),
            'rules_applied': int(rules_applied)
        }
        
        self.log_action(f"Processing complete: {original_rows} → {final_rows} rows, {outliers_detected} outliers, {rules_applied} rules applied")
        
        return self.processing_summary

@app.route('/download-from-url', methods=['POST'])
def download_from_url():
    """Download dataset from URL for large files"""
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
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()
        
        # Determine file type from URL or content-type
        content_type = response.headers.get('content-type', '')
        filename = os.path.basename(parsed_url.path) or 'dataset'
        
        if not filename.endswith(('.csv', '.xlsx', '.xls')):
            if 'csv' in content_type:
                filename += '.csv'
            elif 'excel' in content_type or 'spreadsheet' in content_type:
                filename += '.xlsx'
            else:
                filename += '.csv'  # Default to CSV
        
        # Save file temporarily
        temp_path = os.path.join(UPLOAD_FOLDER, f"url_{uuid.uuid4()}_{filename}")
        
        with open(temp_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        # Read and preview the file
        try:
            if filename.endswith('.csv'):
                df = pd.read_csv(temp_path, nrows=1000)
            else:
                df = pd.read_excel(temp_path, nrows=1000)
                
            processor = DataProcessor(df, {})
            columns = processor.get_column_info(df)
            sample_rows = df.head(10).fillna('').to_dict('records')
            
            return jsonify({
                'success': True,
                'filename': filename,
                'temp_path': temp_path,
                'columns': columns,
                'sample_rows': sample_rows,
                'total_rows': len(df),
                'file_size': os.path.getsize(temp_path)
            })
            
        except Exception as e:
            os.remove(temp_path)  # Clean up on error
            return jsonify({"error": f"Failed to read downloaded file: {str(e)}"}), 400
            
    except requests.RequestException as e:
        return jsonify({"error": f"Failed to download file: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/analyze-mixed-columns', methods=['POST'])
def analyze_mixed_columns():
    """Analyze columns with mixed data types and get user decisions"""
    try:
        data = request.get_json()
        temp_path = data.get('temp_path')
        filename = data.get('filename', 'dataset')
        
        if not temp_path or not os.path.exists(temp_path):
            return jsonify({"error": "File not found"}), 404
            
        # Read full file
        if filename.endswith('.csv'):
            df = pd.read_csv(temp_path)
        else:
            df = pd.read_excel(temp_path)
            
        processor = DataProcessor(df, {})
        mixed_columns = processor.detect_mixed_columns()
        
        return jsonify({
            'success': True,
            'mixed_columns': mixed_columns,
            'requires_decisions': len(mixed_columns) > 0
        })
        
    except Exception as e:
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500

@app.route('/process-with-decisions', methods=['POST'])
def process_with_decisions():
    """Process data with user decisions for mixed columns"""
    try:
        # Handle both file upload and temp file processing
        temp_path = request.form.get('temp_path')
        config = json.loads(request.form.get('config', '{}'))
        column_decisions = json.loads(request.form.get('column_decisions', '{}'))
        
        if temp_path and os.path.exists(temp_path):
            # Processing from URL download
            filename = request.form.get('filename', 'dataset.csv')
            if filename.endswith('.csv'):
                df = pd.read_csv(temp_path)
            else:
                df = pd.read_excel(temp_path)
        elif 'file' in request.files:
            # Regular file upload
            file = request.files['file']
            filename = file.filename
            if filename.endswith('.csv'):
                df = pd.read_csv(file)
            else:
                df = pd.read_excel(file)
        else:
            return jsonify({"error": "No file provided"}), 400
        
        # Process data with decisions
        processor = DataProcessor(df, config)
        
        # Apply column decisions first
        if column_decisions:
            processor.apply_column_decisions(column_decisions)
        
        # Run main processing
        summary = processor.process()
        
        # Generate PDF report
        report_path = processor.generate_pdf_report()
        
        # Save cleaned file
        cleaned_filename = f"cleaned_{processor.version_id}_{filename}"
        cleaned_filepath = os.path.join(CLEANED_FOLDER, cleaned_filename)
        
        if filename.endswith('.csv'):
            processor.df.to_csv(cleaned_filepath, index=False)
        else:
            processor.df.to_excel(cleaned_filepath, index=False)
        
        # Clean up temp file if it exists
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        
        return jsonify({
            'version_id': processor.version_id,
            'original_filename': filename,
            'cleaned_filename': cleaned_filename,
            'summary': summary,
            'audit_trail': processor.audit_trail,
            'download_url': f'/api/download/{cleaned_filename}',
            'report_url': f'/api/download-report/{os.path.basename(report_path)}',
            'charts_generated': len(processor.charts_generated)
        })
        
    except Exception as e:
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500

@app.route('/download-report/<filename>')
def download_report(filename):
    """Download generated PDF report"""
    try:
        return send_from_directory(REPORTS_FOLDER, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "Report not found"}), 404

@app.route('/refine-version', methods=['POST'])
def refine_version():
    """Create a refined version of an existing dataset"""
    try:
        data = request.get_json()
        original_version_id = data.get('original_version_id')
        config = data.get('config', {})
        
        # Find the original cleaned file
        cleaned_files = [f for f in os.listdir(CLEANED_FOLDER) if original_version_id in f]
        if not cleaned_files:
            return jsonify({"error": "Original version not found"}), 404
            
        # Load the original cleaned dataset
        file_path = os.path.join(CLEANED_FOLDER, cleaned_files[0])
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
            
        # Create new processor for refinement
        processor = DataProcessor(df, config)
        processor.log_action(f"Refining version {original_version_id}")
        
        # Process with new configuration
        summary = processor.process()
        
        # Generate new report
        report_path = processor.generate_pdf_report()
        
        # Save refined file
        refined_filename = f"refined_{processor.version_id}_{cleaned_files[0]}"
        refined_filepath = os.path.join(CLEANED_FOLDER, refined_filename)
        
        if file_path.endswith('.csv'):
            processor.df.to_csv(refined_filepath, index=False)
        else:
            processor.df.to_excel(refined_filepath, index=False)
        
        return jsonify({
            'version_id': processor.version_id,
            'original_version_id': original_version_id,
            'refined_filename': refined_filename,
            'summary': summary,
            'audit_trail': processor.audit_trail,
            'download_url': f'/api/download/{refined_filename}',
            'report_url': f'/api/download-report/{os.path.basename(report_path)}',
            'charts_generated': len(processor.charts_generated)
        })
        
    except Exception as e:
        return jsonify({"error": f"Refinement failed: {str(e)}"}), 500

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
    try:
        # Handle both file upload and temp file
        temp_path = request.form.get('temp_path')
        
        if temp_path and os.path.exists(temp_path):
            filename = request.form.get('filename', 'dataset.csv')
            if filename.endswith('.csv'):
                df = pd.read_csv(temp_path, nrows=1000)
            else:
                df = pd.read_excel(temp_path, nrows=1000)
        else:
            if 'file' not in request.files:
                return jsonify({"error": "No file provided"}), 400
                
            file = request.files['file']
            if file.filename == '':
                return jsonify({"error": "No file selected"}), 400
            
            filename = file.filename
            if filename.endswith('.csv'):
                df = pd.read_csv(file, nrows=1000)
            elif filename.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(file, nrows=1000)
            else:
                return jsonify({"error": "Unsupported file type"}), 400
        
        # Create processor to get column info
        processor = DataProcessor(df, {})
        columns = processor.get_column_info(df)
        mixed_columns = processor.detect_mixed_columns()
        
        # Get sample rows
        sample_rows = df.head(10).fillna('').to_dict('records')
        
        return jsonify({
            'columns': columns,
            'mixed_columns': mixed_columns,
            'sample_rows': sample_rows,
            'total_rows': len(df),
            'requires_decisions': len(mixed_columns) > 0
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to preview file: {str(e)}"}), 500

@app.route('/process', methods=['POST'])
def process_data():
    """Process uploaded data with configuration"""
    # Redirect to the new enhanced processing endpoint
    return process_with_decisions()

# Keep the old endpoint for backward compatibility but enhance it
@app.route('/upload', methods=['POST'])
def upload_file():
    """Enhanced upload endpoint with mixed column detection"""
    try:
        # Use the enhanced processing
        return process_with_decisions()

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    """Download processed file"""
    try:
        return send_from_directory(CLEANED_FOLDER, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)


