# CampusCart Phase 0 — install ML dependencies (Windows PowerShell)
# Run from backend folder:  .\scripts\install_ml.ps1

$ErrorActionPreference = "Stop"
$BackendRoot = Split-Path -Parent $PSScriptRoot
Set-Location $BackendRoot

Write-Host "`n=== Installing Python ML packages ===" -ForegroundColor Cyan
pip install -r requirements-ml.txt

Write-Host "`n=== Installing spaCy language model (en_core_web_md) ===" -ForegroundColor Cyan
pip install "en-core-web-md @ https://github.com/explosion/spacy-models/releases/download/en_core_web_md-3.8.0/en_core_web_md-3.8.0-py3-none-any.whl"

Write-Host "`n=== Running Phase 0 verification ===" -ForegroundColor Cyan
python scripts/test_search.py --query "calculator"

Write-Host "`nDone. If BERT failed, try: pip install torch --index-url https://download.pytorch.org/whl/cpu`n" -ForegroundColor Green
