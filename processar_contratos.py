import pandas as pd
import os
import io
from typing import List, Optional

def processar_excel(caminho_arquivo, tipo_filtro):
    try:
        # Lê o Excel completo
        df = pd.read_excel(caminho_arquivo)

        # Normaliza os nomes das colunas
        df.columns = [c.strip().upper() for c in df.columns]

        # Verifica se a coluna AUDITADO existe
        if "AUDITADO" not in df.columns:
            return None, "Coluna 'AUDITADO' não encontrada no arquivo."
        if "CONTRATO" not in df.columns:
            return None, "Coluna 'CONTRATO' não encontrada no arquivo."

        # Aplica o filtro conforme escolha
        if tipo_filtro == "auditado":
            df = df[df["AUDITADO"].astype(str).str.upper() == "AUDI"]
        elif tipo_filtro == "nauditado":
            df = df[df["AUDITADO"].astype(str).str.upper() == "NAUD"]

        # Mesmo que o filtro não retorne nada, força o dataframe existir
        if df.empty:
            df = pd.DataFrame(columns=["CONTRATO", "AUDITADO"])

        # Marca duplicados
        df["CONTRATO_REPETIDO"] = df.duplicated(subset=["CONTRATO"], keep=False)

        # Totais
        total_reais = df["CONTRATO"].nunique()
        total_repetidos = df[df["CONTRATO_REPETIDO"]].shape[0]

        # Cria o resumo
        resumo = pd.DataFrame({
            "CONTRATO": [""],
            "TOTAL_CONTRATOS_REAIS": [total_reais],
            "TOTAL_CONTRATOS_REPETIDOS": [total_repetidos]
        })

        # Junta e garante que colunas apareçam
        for col in resumo.columns:
            if col not in df.columns:
                df[col] = ""

        resultado_final = pd.concat([df, resumo], ignore_index=True)

        # Salva o resultado final
        nome_saida = f"resultado_{tipo_filtro}.xlsx"
        # Garante que a pasta static exista
        os.makedirs("static", exist_ok=True)
        caminho_saida = os.path.join("static", nome_saida)
        resultado_final.to_excel(caminho_saida, index=False)

        # Retorna apenas o nome do arquivo para que o chamador construa a URL de download
        return nome_saida, None

    except Exception as e:
        return None, str(e)


AUDIT_COLUMN_CANDIDATES = ["AUDITADO", "AUD"]
PERIOD_COLUMN_CANDIDATES = [
    "DT.HAB.",
    "DT.HAB",
    "DT.MANIFESTACAO",
    "DT.MANIFESTAÇÃO",
    "DT.HABITACIONAL",
    "DATA HABITACIONAL"
]
DEST_PAGAM_CANDIDATES = ["DEST.PAGAM", "DESTINO DE PAGAMENTO"]
DEST_COMPLEM_CANDIDATES = ["DEST.COMPLEM", "DESTINO DE COMPLEMENTO"]
CONTRATO_COLUMN_CANDIDATES = ["CONTRATO"]
CONTRATOS_COLUMN_CANDIDATES = ["CONTRATOS"]
DESTINO_REMOVE = {"0x0", "1x4", "6x4", "8x4"}


def _lookup_columns(df: pd.DataFrame) -> dict:
    return {str(col).strip().upper(): col for col in df.columns if col is not None}


def _find_column(df: pd.DataFrame, candidates: List[str]) -> Optional[str]:
    lookup = _lookup_columns(df)
    for candidate in candidates:
        key = candidate.strip().upper()
        if key in lookup:
            return lookup[key]
    return None


def _parse_reference_date(reference_date: Optional[str]) -> pd.Timestamp:
    if reference_date:
        parsed = pd.to_datetime(reference_date, errors="coerce")
        if not pd.isna(parsed):
            return pd.Timestamp(parsed).normalize()
    return pd.Timestamp.now().normalize()


def _apply_audit_filter(df: pd.DataFrame, filter_type: str) -> pd.DataFrame:
    if filter_type == "todos":
        return df

    if filter_type not in {"auditado", "nauditado"}:
        return df

    audit_column = _find_column(df, AUDIT_COLUMN_CANDIDATES)
    if not audit_column:
        return df

    col_values = df[audit_column].astype(str).str.upper().str.strip()

    if filter_type == "auditado":
        mask = col_values.isin({"AUD", "AUDI"})
    else:
        mask = col_values == "NAUD"

    return df[mask].copy()


def _apply_period_filter(
    df: pd.DataFrame,
    enabled: bool,
    reference_date: Optional[str],
    months_back: int
) -> pd.DataFrame:
    if not enabled:
        return df

    date_column = _find_column(df, PERIOD_COLUMN_CANDIDATES)
    if not date_column:
        return df

    end_date = _parse_reference_date(reference_date)
    months_back = max(months_back, 0)
    start_date = end_date - pd.DateOffset(months=months_back)

    parsed_dates = pd.to_datetime(df[date_column], errors="coerce")
    mask = (
        parsed_dates.notna()
        & (parsed_dates >= start_date)
        & (parsed_dates <= end_date)
    )

    return df[mask].copy()


def _apply_3026_12_filters(df: pd.DataFrame) -> pd.DataFrame:
    dest_pagam = _find_column(df, DEST_PAGAM_CANDIDATES)
    if dest_pagam:
        df = df[~df[dest_pagam].astype(str).str.lower().isin(DESTINO_REMOVE)].copy()

    dest_complem = _find_column(df, DEST_COMPLEM_CANDIDATES)
    if dest_complem:
        df = df[~df[dest_complem].astype(str).str.lower().isin(DESTINO_REMOVE)].copy()

    contratos_col = _find_column(df, CONTRATOS_COLUMN_CANDIDATES)
    if contratos_col:
        df = df[df[contratos_col].notna()].copy()

    return df


def _apply_file_specific_filters(df: pd.DataFrame, filename: str) -> pd.DataFrame:
    upper_name = filename.upper()

    contrato_col = _find_column(df, CONTRATO_COLUMN_CANDIDATES)
    if ("3026-11" in upper_name or "3026-15" in upper_name) and contrato_col:
        df = df.drop_duplicates(subset=[contrato_col], keep="first").copy()

    if "3026-12" in upper_name:
        df = _apply_3026_12_filters(df)

    return df


def filtrar_planilha_contratos(
    contents: bytes,
    filter_type: str,
    period_filter_enabled: bool,
    reference_date: Optional[str],
    months_back: int,
    filename: str
) -> pd.DataFrame:
    normalized_filter = (filter_type or "todos").lower()

    df = pd.read_excel(io.BytesIO(contents), engine="openpyxl")

    df = _apply_audit_filter(df, normalized_filter)
    df = _apply_period_filter(df, period_filter_enabled, reference_date, months_back)
    df = _apply_file_specific_filters(df, filename)

    return df


def concatenar_dataframes(dataframes: List[pd.DataFrame]) -> pd.DataFrame:
    if not dataframes:
        return pd.DataFrame()
    return pd.concat(dataframes, ignore_index=True)
