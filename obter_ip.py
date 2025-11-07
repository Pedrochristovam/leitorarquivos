#!/usr/bin/env python3
"""
Script para obter o IP local e mostrar a URL para compartilhar
"""
import socket

def get_local_ip():
    """Obtém o IP local da máquina"""
    try:
        # Conecta a um endereço externo para descobrir o IP local
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        # Fallback: tenta obter o hostname
        try:
            hostname = socket.gethostname()
            ip = socket.gethostbyname(hostname)
            return ip
        except Exception:
            return "127.0.0.1"

if __name__ == "__main__":
    ip = get_local_ip()
    print("=" * 50)
    print("  SISTEMA DE CONTRATOS 3026")
    print("  URL PARA COMPARTILHAR")
    print("=" * 50)
    print()
    print(f"IP da sua máquina: {ip}")
    print()
    print("=" * 50)
    print("  URL PARA COMPARTILHAR:")
    print("=" * 50)
    print()
    print("  DESENVOLVIMENTO (React):")
    print(f"  http://{ip}:5173")
    print()
    print("  PRODUÇÃO (Servidor unificado):")
    print(f"  http://{ip}:8010")
    print()
    print("=" * 50)
    print()
    print("⚠️  IMPORTANTE:")
    print("  - Certifique-se de que o firewall permite conexões")
    print("  - Compartilhe essas URLs com seu time")
    print("  - Todos devem estar na mesma rede")
    print()
    input("Pressione Enter para fechar...")

