
from io import BytesIO

import pandas as pd


def profile_csv(content: bytes) -> dict:
    """Generate a basic data profiling report from CSV bytes."""

    try:
        df = pd.read_csv(BytesIO(content))
    except (pd.errors.ParserError, UnicodeDecodeError, ValueError) as exc:
        raise ValueError(
            "Unable to parse the CSV. Check its format and encoding."
        ) from exc

    if len(df.columns) == 0:
        raise ValueError("The CSV does not contain any columns.")

    row_count = len(df)
    column_count = len(df.columns)

    # Treat blank strings and whitespace-only strings as missing.
    df = df.replace(r"^\s*$", pd.NA, regex=True)

    columns = []

    for column in df.columns:
        series = df[column]
        missing_count = int(series.isna().sum())
        non_missing = series.dropna()

        columns.append({
            "name": str(column),
            "data_type": str(series.dtype),
            "missing_count": missing_count,
            "missing_percentage": round(
                missing_count / row_count * 100, 2
            ) if row_count else 0.0,
            "unique_count": int(non_missing.nunique()),
            "duplicate_values": int(
                len(non_missing) - non_missing.nunique()
            ),
        })

    duplicate_row_count = int(df.duplicated().sum())

    numeric_columns = []

    for column in df.select_dtypes(include="number").columns:
        series = df[column].dropna()

        numeric_columns.append({
            "name": str(column),
            "minimum": float(series.min()) if not series.empty else None,
            "maximum": float(series.max()) if not series.empty else None,
            "mean": float(series.mean()) if not series.empty else None,
            "median": float(series.median()) if not series.empty else None,
        })

    return {
        "summary": {
            "row_count": row_count,
            "column_count": column_count,
            "duplicate_row_count": duplicate_row_count,
            "total_missing_values": sum(
                column["missing_count"] for column in columns
            ),
        },
        "columns": columns,
        "numeric_statistics": numeric_columns,
        "preview_rows": (
            df.head(10).astype(object).where(df.notna(), None)
            .to_dict(orient="records")
        ),
    }
