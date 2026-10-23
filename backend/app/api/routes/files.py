
from io import BytesIO
from uuid import uuid4

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile
from app.services.profiling_service import profile_csv

router = APIRouter(prefix="/api/v1/files", tags=["Files"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB



@router.post("/preview")
async def preview_csv(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a CSV file.",
        )

    content = await file.read(MAX_FILE_SIZE + 1)

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File exceeds the 10 MB preview limit.",
        )

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    try:
        df = pd.read_csv(BytesIO(content))
    except (pd.errors.ParserError, UnicodeDecodeError):
        raise HTTPException(
            status_code=400,
            detail="Unable to parse the CSV. Check its format and encoding.",
        ) from None

    columns = [
        {
            "name": str(column),
            "data_type": str(df[column].dtype),
            "missing_values": int(df[column].isna().sum()),
        }
        for column in df.columns
    ]

    preview_df = df.head(10).astype(object).where(df.head(10).notna(), None)

    return {
        "filename": file.filename,
        "row_count": len(df),
        "column_count": len(df.columns),
        "columns": columns,
        "preview_rows": preview_df.to_dict(orient="records"),
    }


@router.post("/profile", tags=["Profiling"])
async def profile_uploaded_csv(file: UploadFile):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a CSV file.",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded CSV file is empty.",
        )

    try:
        result = profile_csv(content)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    return {
        "profile_id": str(uuid4()),
        "filename": file.filename,
        "status": "completed",
        "profiling_report": result,
    }

