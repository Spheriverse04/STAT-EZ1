# backend/data_processor.py
import os
import uuid
import logging
from datetime import datetime

import pandas as pd
import numpy as np

# sklearn optional
try:
    from sklearn.impute import KNNImputer
    SKLEARN_AVAILABLE = True
except Exception:
    SKLEARN_AVAILABLE = False

# matplotlib for simple PDF report
try:
    import matplotlib.pyplot as plt
    from matplotlib.backends.backend_pdf import PdfPages
    MATPLOTLIB_AVAILABLE = True
except Exception:
    MATPLOTLIB_AVAILABLE = False


class DataProcessor:
    """
    Robust, defensive DataProcessor:
      - schema mapping
      - conversions (numeric/date/split/drop)
      - missing-value handling (mean/median/mode/knn)
      - outlier handling (IQR cap/remove)
      - summary generation
      - save cleaned CSV + optional PDF report
    """

    def __init__(self, df, config=None, decisions=None, logger=None):
        self.df = df.copy()
        self.config = config or {}
        self.decisions = decisions or {}
        self.logger = logger or logging.getLogger(__name__)
        self.logs = []

    def log(self, *parts):
        msg = " ".join(map(str, parts))
        self.logs.append(msg)
        if self.logger:
            try:
                self.logger.debug(msg)
            except Exception:
                pass

    def apply_schema_mapping(self):
        mapping = self.config.get("schema_mapping") or {}
        if isinstance(mapping, dict) and mapping:
            self.log("apply_schema_mapping:", mapping)
            self.df.rename(columns=mapping, inplace=True)

    def convert_columns(self):
        # decisions is dict: { "col_name": "to_numeric" } or { "col": {"action":"split","delimiter":";","prefix":"tags"}}
        for col, dec in (self.decisions or {}).items():
            if col not in self.df.columns:
                self.log(f"convert_columns: column '{col}' not present, skipping")
                continue

            action = dec.get("action") if isinstance(dec, dict) else dec
            try:
                if action in ("numeric", "to_numeric"):
                    self.log(f"Converting {col} -> numeric")
                    self.df[col] = pd.to_numeric(self.df[col], errors="coerce")
                elif action in ("date", "to_date"):
                    self.log(f"Converting {col} -> datetime")
                    self.df[col] = pd.to_datetime(self.df[col], errors="coerce", infer_datetime_format=True)
                elif action == "split":
                    delim = dec.get("delimiter", ";")
                    prefix = dec.get("prefix", col)
                    self.log(f"Splitting {col} by '{delim}', prefix={prefix}")
                    splits = self.df[col].astype(str).str.split(delim, expand=True)
                    for i in range(splits.shape[1]):
                        new_col = f"{prefix}_{i+1}"
                        self.df[new_col] = splits[i].replace("nan", np.nan)
                elif action == "drop":
                    self.log(f"Dropping column {col}")
                    self.df.drop(columns=[col], inplace=True, errors="ignore")
                else:
                    self.log(f"Unknown conversion action '{action}' for {col} -> skipping")
            except Exception as e:
                self.log(f"convert_columns: failed for {col} with action {action}: {e}")

    def handle_missing_values(self):
        impute_cfg = self.config.get("imputation") or {}
        method = impute_cfg.get("method")
        if not method:
            self.log("No imputation method configured")
            return

        self.log("Imputation method:", method)
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns.tolist()

        try:
            if method in ("mean", "median"):
                for c in numeric_cols:
                    if self.df[c].isna().any():
                        val = getattr(self.df[c], method)()
                        self.df[c].fillna(val, inplace=True)
                        self.log(f"Filled {c} with {method}={val}")
            elif method == "mode":
                for c in self.df.columns:
                    if self.df[c].isna().any():
                        mode = self.df[c].mode()
                        fill = mode.iloc[0] if not mode.empty else None
                        self.df[c].fillna(fill, inplace=True)
                        self.log(f"Filled {c} with mode={fill}")
            elif method == "knn":
                if not SKLEARN_AVAILABLE:
                    self.log("sklearn not available => falling back to mean imputation for numeric columns")
                    for c in numeric_cols:
                        if self.df[c].isna().any():
                            self.df[c].fillna(self.df[c].mean(), inplace=True)
                else:
                    self.log("Running KNN imputer on numeric columns")
                    imputer = KNNImputer()
                    self.df[numeric_cols] = imputer.fit_transform(self.df[numeric_cols])
            else:
                self.log(f"Unknown imputation method '{method}': skipping")
        except Exception as e:
            self.log("handle_missing_values error:", e)

    def detect_outliers(self):
        cfg = self.config.get("outliers") or {}
        if not cfg:
            self.log("No outlier config; skipping")
            return

        method = cfg.get("method", "iqr")
        action = cfg.get("action", "cap")
        num_cols = self.df.select_dtypes(include=[np.number]).columns

        self.log("Outlier detection:", method, "action:", action)
        try:
            if method == "iqr":
                for c in num_cols:
                    q1 = self.df[c].quantile(0.25)
                    q3 = self.df[c].quantile(0.75)
                    iqr = q3 - q1
                    lower = q1 - 1.5 * iqr
                    upper = q3 + 1.5 * iqr
                    if action == "remove":
                        before = len(self.df)
                        self.df = self.df[(self.df[c].isna()) | ((self.df[c] >= lower) & (self.df[c] <= upper))]
                        self.log(f"Removed outliers for {c}: {before} -> {len(self.df)}")
                    elif action == "cap":
                        self.df[c] = np.where(self.df[c] < lower, lower, self.df[c])
                        self.df[c] = np.where(self.df[c] > upper, upper, self.df[c])
                        self.log(f"Capped outliers for {c} to [{lower}, {upper}]")
            else:
                self.log("Unknown outlier method", method)
        except Exception as e:
            self.log("detect_outliers error:", e)

    def generate_summary(self):
        df = self.df
        try:
            missing = df.isna().sum().to_dict()
            dtypes = {c: str(t) for c, t in df.dtypes.items()}
            basic_stats = df.describe(include="all", datetime_is_numeric=True).to_dict()
            summary = {
                "rows": len(df),
                "columns": df.columns.tolist(),
                "missing_values": missing,
                "dtypes": dtypes,
                "basic_stats": basic_stats,
                "example_rows": df.head(3).to_dict(orient="records"),
            }
            return summary
        except Exception as e:
            self.log("generate_summary error:", e)
            return {"rows": len(df), "columns": df.columns.tolist()}

    def save_cleaned(self, out_dir):
        try:
            os.makedirs(out_dir, exist_ok=True)
            fname = f"cleaned_{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}_{uuid.uuid4().hex[:8]}.csv"
            path = os.path.join(out_dir, fname)
            self.df.to_csv(path, index=False)
            self.log("Saved cleaned file:", path)
            return path
        except Exception as e:
            self.log("save_cleaned error:", e)
            raise

    def generate_report(self, out_dir):
        if not MATPLOTLIB_AVAILABLE:
            self.log("matplotlib not available; skipping PDF report generation")
            return None

        os.makedirs(out_dir, exist_ok=True)
        pdf_path = os.path.join(out_dir, f"report_{uuid.uuid4().hex[:8]}.pdf")
        try:
            with PdfPages(pdf_path) as pdf:
                # Page 1: textual summary
                fig, ax = plt.subplots(figsize=(8.27, 11.69))
                ax.axis("off")
                txt = f"Report generated: {datetime.utcnow().isoformat()}\n\n"
                txt += f"Rows: {len(self.df)}\nColumns: {len(self.df.columns)}\n\n"
                missing = self.df.isna().sum().sort_values(ascending=False)
                txt += "Missing values (top 10):\n"
                for c, v in missing.head(10).items():
                    txt += f"  {c}: {v}\n"
                ax.text(0.01, 0.99, txt, va="top", fontsize=10)
                pdf.savefig(fig)
                plt.close(fig)

                # Histograms for up to 3 numeric columns
                num_cols = self.df.select_dtypes(include=[np.number]).columns.tolist()[:3]
                for col in num_cols:
                    fig, ax = plt.subplots()
                    self.df[col].dropna().hist(ax=ax, bins=30)
                    ax.set_title(f"Histogram: {col}")
                    pdf.savefig(fig)
                    plt.close(fig)

            self.log("Generated PDF report:", pdf_path)
            return pdf_path
        except Exception as e:
            self.log("generate_report failed:", e)
            return None

    def process(self, cleaned_dir, report_dir=None, generate_report_flag=True):
        try:
            self.log("Starting processing pipeline")
            self.apply_schema_mapping()
            self.convert_columns()
            self.handle_missing_values()
            self.detect_outliers()
            summary = self.generate_summary()

            cleaned_path = self.save_cleaned(cleaned_dir)
            report_path = None
            if generate_report_flag:
                report_path = self.generate_report(report_dir or cleaned_dir)

            return {
                "cleaned_path": cleaned_path,
                "report_path": report_path,
                "summary": summary,
                "logs": self.logs,
            }
        except Exception as e:
            self.log("process() fatal error:", e)
            raise

