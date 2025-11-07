# 🌐 Guia Rápido: Compartilhar Aplicação na Rede

## 🚀 Passo a Passo Simples

### 1️⃣ Obter seu IP Local

**Execute:**
```bash
obter_ip.bat
```

Ou manualmente:
```bash
ipconfig
```
Procure por "IPv4" → Exemplo: `192.168.1.100`

### 2️⃣ Iniciar Aplicação

**Execute:**
```bash
INICIAR_REDE.bat
```

Isso vai iniciar:
- ✅ Backend na porta 8010
- ✅ Frontend na porta 5173

### 3️⃣ Compartilhar URL

**Desenvolvimento:**
```
http://SEU_IP:5173
```

**Produção (Recomendado):**
```bash
npm run build
python servidor.py
```
```
http://SEU_IP:8010
```

### 4️⃣ Configurar Firewall

**Windows:**
1. Painel de Controle → Firewall do Windows
2. Configurações avançadas
3. Regras de Entrada → Nova Regra
4. Porta → TCP → 5173 (ou 8010) → Permitir

**Ou execute como Administrador:**
```bash
netsh advfirewall firewall add rule name="Sistema Contratos 5173" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="Sistema Contratos 8010" dir=in action=allow protocol=TCP localport=8010
```

---

## ✅ Checklist

- [ ] IP local obtido
- [ ] Servidores iniciados
- [ ] Firewall configurado
- [ ] URL compartilhada com o time
- [ ] Testado de outro computador

---

## 🎯 Exemplo Prático

**Seu IP:** `192.168.1.100`

**Compartilhe com seu time:**
```
http://192.168.1.100:8010
```

**Todos acessam a mesma aplicação!** 🎉

---

## ⚠️ Dicas

1. **Todos na mesma rede WiFi/Ethernet**
2. **Sua máquina deve estar ligada**
3. **Use modo produção** (`npm run build`) para melhor performance
4. **Firewall deve permitir conexões**

---

**Pronto! Sua aplicação está acessível na rede!** 🚀

