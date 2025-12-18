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
HABITACIONAL_COLUMN_CANDIDATES = [
    "W",  # Coluna W diretamente (BEMGE 3026-11)
    "Y",  # Coluna Y diretamente (MINAS CAIXA 3026-11)
    "DATA HABITACIONAL",
    "DT.HABITACIONAL",
    "DT.HAB.",
    "DT.HAB"
]
MINAS_CAIXA_3026_15_COLUMNS = ["S", "W", "Z", "AB", "AD", "AK", "AL"]  # Colunas para remover horas
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


def _apply_habitacional_filter(
    df: pd.DataFrame,
    reference_date: Optional[str],
    months_back: int,
    column_index: Optional[int] = None
) -> pd.DataFrame:
    """
    Aplica filtro de Data Habitacional para 3026-11
    - BEMGE: coluna W (índice 22)
    - MINAS CAIXA: coluna Y (índice 24)
    """
    habitacional_col = None
    
    # Se especificado o índice da coluna, usar diretamente
    if column_index is not None and len(df.columns) > column_index:
        habitacional_col = df.columns[column_index]
    
    # Se não encontrou, tenta pelos nomes
    if habitacional_col is None:
        habitacional_col = _find_column(df, HABITACIONAL_COLUMN_CANDIDATES)
    
    if not habitacional_col:
        return df  # Se não encontrar a coluna, retorna sem filtrar

    end_date = _parse_reference_date(reference_date)
    months_back = max(months_back, 0)
    start_date = end_date - pd.DateOffset(months=months_back)

    parsed_dates = pd.to_datetime(df[habitacional_col], errors="coerce")
    mask = (
        parsed_dates.notna()
        & (parsed_dates >= start_date)
        & (parsed_dates <= end_date)
    )

    return df[mask].copy()


def _apply_minas_caixa_3026_15_filters(
    df: pd.DataFrame,
    reference_date: Optional[str],
    months_back: int
) -> pd.DataFrame:
    """
    Aplica filtros específicos para 3026-15 MINAS CAIXA:
    - Remove horas das colunas S, W, Z, AB, AD, AK, AL (mantém apenas data)
    - Aplica filtro de data na coluna AB (últimos 2 meses) se reference_date fornecido
    """
    # Remover horas das colunas específicas
    col_indices = {
        'S': 18,   # Coluna S é índice 18 (0-indexed)
        'W': 22,   # Coluna W é índice 22
        'Z': 25,   # Coluna Z é índice 25
        'AB': 27,  # Coluna AB é índice 27
        'AD': 29,  # Coluna AD é índice 29
        'AK': 36,  # Coluna AK é índice 36
        'AL': 37   # Coluna AL é índice 37
    }
    
    for col_name, col_idx in col_indices.items():
        if len(df.columns) > col_idx:
            col = df.columns[col_idx]
            # Converter para datetime e remover horas (manter apenas data)
            try:
                df[col] = pd.to_datetime(df[col], errors="coerce")
                # Se for datetime com hora, remover a hora
                df[col] = df[col].dt.normalize()  # Remove horas, mantém data
            except Exception:
                # Se não conseguir converter, manter como está
                pass
    
    # Aplicar filtro de data na coluna AB (últimos 2 meses) APENAS se reference_date fornecido
    if reference_date and len(df.columns) > 27:  # Coluna AB é índice 27
        ab_col = df.columns[27]
        end_date = _parse_reference_date(reference_date)
        months_back = max(months_back, 0)
        start_date = end_date - pd.DateOffset(months=months_back)
        
        # Converter para datetime se ainda não for
        parsed_dates = pd.to_datetime(df[ab_col], errors="coerce")
        mask = (
            parsed_dates.notna()
            & (parsed_dates >= start_date)
            & (parsed_dates <= end_date)
        )
        df = df[mask].copy()
    
    return df


def _apply_file_specific_filters(df: pd.DataFrame, filename: str, bank_type: Optional[str] = None) -> pd.DataFrame:
    """
    Aplica filtros específicos por tipo de arquivo.
    IMPORTANTE: NÃO remove duplicados automaticamente - apenas aplica filtros específicos.
    """
    upper_name = filename.upper()
    bank_lower = (bank_type or "").lower()

    # Aplicar filtros específicos do 3026-12 (DEST.PAGAM, DEST.COMPLEM)
    if "3026-12" in upper_name:
        df = _apply_3026_12_filters(df)

    # Para 3026-15 e BEMGE: remover duplicados pela coluna D APENAS se especificado
    # NOTA: Esta funcionalidade será aplicada apenas quando explicitamente solicitada
    # Por enquanto, não removemos duplicados automaticamente
    
    return df


def filtrar_planilha_contratos(
    contents: bytes,
    filter_type: str,
    period_filter_enabled: bool,
    reference_date: Optional[str],
    months_back: int,
    filename: str,
    bank_type: Optional[str] = None,
    habitacional_filter_enabled: bool = False,
    habitacional_reference_date: Optional[str] = None,
    habitacional_months_back: int = 2,
    minas_caixa_3026_15_filter_enabled: bool = False,
    minas_caixa_3026_15_reference_date: Optional[str] = None,
    minas_caixa_3026_15_months_back: int = 2
) -> pd.DataFrame:
    """
    Filtra planilha de contratos.
    IMPORTANTE: Não remove duplicados automaticamente - mantém todos os dados originais.
    Aplica apenas os filtros explicitamente habilitados pelo usuário.
    """
    normalized_filter = (filter_type or "todos").lower()
    bank_lower = (bank_type or "").lower()
    filename_upper = filename.upper()

    df = pd.read_excel(io.BytesIO(contents), engine="openpyxl")

    # Aplicar filtro de auditado/não auditado (sempre aplicado conforme seleção)
    df = _apply_audit_filter(df, normalized_filter)
    
    # Aplicar filtro de período APENAS se habilitado pelo usuário
    if period_filter_enabled:
        df = _apply_period_filter(df, period_filter_enabled, reference_date, months_back)
    
    # Aplicar filtro de Data Habitacional para 3026-11
    if "3026-11" in filename_upper and habitacional_filter_enabled:
        if bank_lower == "bemge":
            # BEMGE: coluna W (índice 22)
            df = _apply_habitacional_filter(
                df, 
                habitacional_reference_date, 
                habitacional_months_back,
                column_index=22
            )
        elif bank_lower == "minas_caixa":
            # MINAS CAIXA: coluna Y (índice 24)
            df = _apply_habitacional_filter(
                df, 
                habitacional_reference_date, 
                habitacional_months_back,
                column_index=24
            )
    
    # Aplicar filtros específicos para 3026-15 MINAS CAIXA
    if bank_lower == "minas_caixa" and "3026-15" in filename_upper:
        df = _apply_minas_caixa_3026_15_filters(
            df,
            minas_caixa_3026_15_reference_date if minas_caixa_3026_15_filter_enabled else None,
            minas_caixa_3026_15_months_back if minas_caixa_3026_15_filter_enabled else 0
        )
    
    # Aplicar filtros específicos do arquivo (sem remover duplicados)
    df = _apply_file_specific_filters(df, filename, bank_lower)

    return df


def processar_3026_12_com_abas(
    contents: bytes,
    bank_type: str,
    filter_type: str,
    period_filter_enabled: bool = False,
    reference_date: Optional[str] = None,
    months_back: int = 2
) -> dict:
    """
    Processa arquivo 3026-12 e retorna dicionário com abas separadas para AUD e NAUD
    Retorna: {'aud': DataFrame, 'naud': DataFrame, 'todos': DataFrame}
    IMPORTANTE: NÃO remove duplicados - mantém todos os dados originais.
    """
    df = pd.read_excel(io.BytesIO(contents), engine="openpyxl")
    
    # Aplicar filtros específicos do 3026-12 (DEST.PAGAM, DEST.COMPLEM)
    df = _apply_3026_12_filters(df)
    
    # Aplicar filtro de período APENAS se habilitado
    if period_filter_enabled:
        df = _apply_period_filter(df, period_filter_enabled, reference_date, months_back)
    
    # Separar por AUDITADO (mantendo todos os dados, incluindo duplicados)
    audit_col = _find_column(df, AUDIT_COLUMN_CANDIDATES)
    if not audit_col:
        return {'aud': pd.DataFrame(), 'naud': pd.DataFrame(), 'todos': df}
    
    col_values = df[audit_col].astype(str).str.upper().str.strip()
    
    df_aud = df[col_values.isin({"AUD", "AUDI"})].copy()
    df_naud = df[col_values == "NAUD"].copy()
    
    # NÃO remover duplicados - manter todos os dados originais
    
    return {
        'aud': df_aud,
        'naud': df_naud,
        'todos': df
    }


def concatenar_dataframes(dataframes: List[pd.DataFrame]) -> pd.DataFrame:
    if not dataframes:
        return pd.DataFrame()
    return pd.concat(dataframes, ignore_index=True)
